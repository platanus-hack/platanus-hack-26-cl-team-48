import { encodePeopleTable, PEOPLE_ROWS } from "@nodomics/executor-conformance";
import { NepErrorCode, type ExecutorLog, type ExecutorParams } from "@nodomics/protocol";
import { JsonRpcErrorCode } from "@nodomics/rpc";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import type { InProcessExecutor } from "@nodomics/protocol";
import { createPyodideExecutor, type PyodideExecutorOptions } from "./pyodide-executor.ts";

const STARTUP_TIMEOUT_MS = 300_000;
/** matplotlib and Jedi are not bundled with the pyodide package; they download from its CDN. */
const HAS_NETWORK = process.env["NODOMICS_PYODIDE_NETWORK"] === "1";
const DOWNLOAD_TIMEOUT_MS = 300_000;
const PNG_SIGNATURE = [137, 80, 78, 71];

const SHOWS_A_FIGURE = [
  "import matplotlib.pyplot as plt",
  "def run(inputs, params):",
  "    plt.figure(figsize=(4, 3))",
  "    plt.plot([1, 2])",
  "    plt.title('Ventas')",
  "    plt.show()",
  "    return {}",
].join("\n");

describe("Pyodide executor", () => {
  const context: { pyodide?: PyodideInterface; executor?: InProcessExecutor } = {};
  const executor = (): InProcessExecutor => {
    if (context.executor === undefined) throw new Error("Pyodide not started");
    return context.executor;
  };
  const start = async (options: Partial<PyodideExecutorOptions>): Promise<InProcessExecutor> => {
    if (context.pyodide === undefined) throw new Error("Pyodide not started");
    return createPyodideExecutor({ pyodide: context.pyodide, ...options });
  };
  const runPython = async (code: string, inputs: Record<string, string> = {}) =>
    executor().handlers["exec.run"]({
      taskId: "t1",
      task: { kind: "python", code, entry: "run", inputs, params: {} },
    });
  const load = (
    location: ExecutorParams<"exec.load">["location"],
    format: "csv" | "json" = "csv",
  ) => executor().handlers["exec.load"]({ sourceId: "s", format, location });

  beforeAll(async () => {
    context.pyodide = await loadPyodide();
    context.executor = await start({});
  }, STARTUP_TIMEOUT_MS);

  it("announces the python runtime with pandas and pyarrow available", async () => {
    const hello = await executor().handlers["exec.hello"]({});

    expect(hello).toMatchObject({ executor: "pyodide", runtimes: ["python"] });
    expect(hello.packages).toEqual(expect.arrayContaining(["pandas", "pyarrow"]));
  });

  it("sends what the task prints as exec.log lines of that task", async () => {
    const logs: ExecutorLog[] = [];
    const stop = executor().onLog((log) => logs.push(log));

    await runPython("def run(inputs, params):\n    print('hola')\n    return {}");
    stop();

    expect(logs).toEqual([{ taskId: "t1", level: "info", message: "hola" }]);
  });

  it("stops sending logs to a handler once it unsubscribes", async () => {
    const logs: ExecutorLog[] = [];
    executor().onLog((log) => logs.push(log))();

    await runPython("def run(inputs, params):\n    print('hola')\n    return {}");

    expect(logs).toEqual([]);
  });

  it("reports an exception as PYTHON_EXCEPTION with the traceback as detail", async () => {
    const run = await runPython("def run(inputs, params):\n    return 1 / 0");

    expect(run).toMatchObject({
      ok: false,
      error: {
        code: "PYTHON_EXCEPTION",
        message: expect.stringContaining("ZeroDivisionError") as unknown,
        detail: expect.stringContaining("Traceback") as unknown,
      },
    });
  });

  it("returns materialization failures as PYTHON_EXCEPTION and preserves task logs", async () => {
    const logs: ExecutorLog[] = [];
    const stop = executor().onLog((log) => logs.push(log));

    try {
      const run = await runPython(
        "import pandas as pd\ndef run(inputs, params):\n    print('before materialization')\n    return {'out': pd.DataFrame({'x': [1, 'a']})}",
      );

      expect(run).toMatchObject({
        ok: false,
        error: {
          code: "PYTHON_EXCEPTION",
          detail: expect.stringContaining("ArrowInvalid") as unknown,
        },
      });
      expect(logs).toEqual([{ taskId: "t1", level: "info", message: "before materialization" }]);
    } finally {
      stop();
    }
  });

  it("reports a task that does not return a dict of DataFrames as PYTHON_EXCEPTION", async () => {
    const run = await runPython("def run(inputs, params):\n    return 42");

    expect(run).toMatchObject({ ok: false, error: { code: "PYTHON_EXCEPTION" } });
  });

  it("keeps an input result intact when the task mutates its DataFrame", async () => {
    const people = await executor().handlers["exec.import"]({ arrow: encodePeopleTable() });

    await runPython("def run(inputs, params):\n    inputs['p']['id'] = 0\n    return {}", {
      p: people.id,
    });
    const page = await executor().handlers["exec.page"]({
      resultId: people.id,
      offset: 0,
      limit: 10,
    });

    expect(page.rows).toEqual(PEOPLE_ROWS);
  });

  it("rejects a task whose input result is no longer held", async () => {
    await expect(
      runPython("def run(inputs, params):\n    return {}", { p: "gone" }),
    ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
  });

  it("loads a JSON source from bytes", async () => {
    const json = new TextEncoder().encode('[{"x": 1}, {"x": 2}, {"x": 3}]');

    await expect(load({ kind: "bytes", bytes: json }, "json")).resolves.toMatchObject({
      ok: true,
      ref: { rowCount: 3 },
    });
  });

  it("loads a source from a URL through the injected fetch", async () => {
    const csv = new TextEncoder().encode("a\n1\n2\n");
    const withFetch = await start({ fetch: () => Promise.resolve(new Response(csv)) });

    const load = await withFetch.handlers["exec.load"]({
      sourceId: "s",
      format: "csv",
      location: { kind: "url", url: "https://example.test/a.csv" },
    });

    expect(load).toMatchObject({ ok: true, ref: { rowCount: 2 } });
  });

  it("returns a URL that cannot be fetched as a SOURCE_UNREADABLE value", async () => {
    const offline = await start({ fetch: () => Promise.reject(new TypeError("fetch failed")) });

    const load = await offline.handlers["exec.load"]({
      sourceId: "s",
      format: "csv",
      location: { kind: "url", url: "https://example.test/a.csv" },
    });

    expect(load).toMatchObject({ ok: false, error: { code: "SOURCE_UNREADABLE" } });
  });

  it("returns a local path, which the browser cannot read, as a SOURCE_UNREADABLE value", async () => {
    await expect(load({ kind: "path", path: "/data/a.csv" })).resolves.toMatchObject({
      ok: false,
      error: { code: "SOURCE_UNREADABLE" },
    });
  });

  it("offers every package it can import, not only the loaded ones", async () => {
    const hello = await executor().handlers["exec.hello"]({});

    expect(hello.packages).toEqual(expect.arrayContaining(["matplotlib", "jedi", "scipy"]));
  });

  it("serves no figure it does not hold", async () => {
    await expect(executor().handlers["exec.display"]({ displayId: "d_x" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });

  it("reports no figures for code that shows none", async () => {
    const result = await runPython("def run(inputs, params):\n    return {}");

    expect(result).toEqual({ ok: true, outputs: {}, displays: [] });
  });

  it.skipIf(!HAS_NETWORK)(
    "loads the packages the code imports and keeps each shown figure as a PNG",
    async () => {
      const result = await runPython(SHOWS_A_FIGURE);

      if (!result.ok) throw new Error(result.error.detail);
      const [figure] = result.displays ?? [];
      expect(figure).toMatchObject({ mime: "image/png", width: 400, height: 300, title: "Ventas" });
      const content = await executor().handlers["exec.display"]({ displayId: figure?.id ?? "" });
      expect([...content.bytes.slice(0, PNG_SIGNATURE.length)]).toEqual(PNG_SIGNATURE);
      await executor().handlers["exec.drop"]({ resultIds: [figure?.id ?? ""] });
      await expect(
        executor().handlers["exec.display"]({ displayId: figure?.id ?? "" }),
      ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
    },
    DOWNLOAD_TIMEOUT_MS,
  );

  it.skipIf(!HAS_NETWORK)(
    "loads the packages imported by code that arrives as a parameter",
    async () => {
      const result = await executor().handlers["exec.run"]({
        taskId: "t1",
        task: {
          kind: "python",
          code: "def run(inputs, params):\n    exec(params['code'], {})\n    return {}",
          entry: "run",
          inputs: {},
          params: { code: "import more_itertools" },
        },
      });

      expect(result).toMatchObject({ ok: true });
    },
    DOWNLOAD_TIMEOUT_MS,
  );

  it.skipIf(!HAS_NETWORK)(
    "completes code with the libraries of the environment",
    async () => {
      const completions = await executor().handlers["exec.complete"]({
        code: "import pandas as pd\npd.read_cs",
        line: 2,
        column: 10,
      });

      expect(completions.items).toContainEqual({
        label: "read_csv",
        kind: "function",
        detail: "def read_csv",
      });
    },
    DOWNLOAD_TIMEOUT_MS,
  );

  it.skipIf(!HAS_NETWORK)(
    "rejects a completion position outside the code",
    async () => {
      await expect(
        executor().handlers["exec.complete"]({ code: "x", line: 4, column: 0 }),
      ).rejects.toMatchObject({ code: JsonRpcErrorCode.INVALID_PARAMS });
    },
    DOWNLOAD_TIMEOUT_MS,
  );
});
