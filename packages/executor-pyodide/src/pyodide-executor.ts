import type { Static, TSchema } from "@sinclair/typebox";
import {
  CodeCompletions,
  DataPage,
  DataProfile,
  ExecutorRequests,
  NepErrorCode,
  parse,
  ResultRef,
  type ExecutorLog,
  type ExecutorParams,
  type ExecutorResult,
  type Task,
} from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import type { PyodideInterface } from "pyodide";
import type { InProcessExecutor } from "@nodomics/protocol";
import { installPythonRuntime, type PythonRuntime } from "./python-runtime.ts";
import { readSourceBytes, sourceUnreadable } from "./source-location.ts";

export type PyodideExecutorOptions = {
  readonly pyodide: PyodideInterface;
  /** Defaults to the platform `fetch`; injected so URL sources can be tested offline. */
  readonly fetch?: (url: string) => Promise<Response>;
};

const EXECUTOR_NAME = "pyodide";
const COMPLETION_PACKAGE = "jedi";
const QUIET = { messageCallback: () => undefined };
const LOG_LEVELS: Readonly<Record<string, ExecutorLog["level"]>> = {
  info: "info",
  warn: "warn",
  error: "error",
};

type LogListeners = Set<(log: ExecutorLog) => void>;

/** Adapts Pyodide to the executor protocol. Results are pandas DataFrames held by id. */
export async function createPyodideExecutor(
  options: PyodideExecutorOptions,
): Promise<InProcessExecutor> {
  const { pyodide } = options;
  const runtime = await installPythonRuntime(pyodide);
  const listeners: LogListeners = new Set();
  const fetchUrl = options.fetch ?? ((url: string) => fetch(url));
  const completion: { ready?: Promise<unknown> } = {};
  return {
    handlers: {
      "exec.hello": () =>
        Promise.resolve({
          executor: EXECUTOR_NAME,
          runtimes: ["python"],
          packages: importablePackages(pyodide),
        }),
      "exec.run": async (params) => {
        await loadImportedPackages(pyodide, params.task);
        return runTask(runtime, listeners, params);
      },
      "exec.page": (params) => settle(() => readPage(runtime, params)),
      "exec.profile": ({ resultId }) =>
        settle(() =>
          parseRuntimeJson(DataProfile, runtime.profile(requireResult(runtime, resultId))),
        ),
      "exec.export": ({ resultId }) =>
        settle(() => ({ arrow: runtime.exportArrow(requireResult(runtime, resultId)) })),
      "exec.import": ({ arrow }) =>
        settle(() => parseRuntimeJson(ResultRef, runtime.importArrow(arrow))),
      "exec.load": async ({ format, location }) => {
        const bytes = await readSourceBytes(location, fetchUrl);
        return bytes.ok ? loadSource(runtime, format, bytes.value) : bytes;
      },
      "exec.drop": ({ resultIds }) =>
        settle(() => {
          runtime.drop(JSON.stringify(resultIds));
          return {};
        }),
      "exec.display": ({ displayId }) =>
        settle(() => ({
          mime: "image/png",
          bytes: runtime.display(requireFigure(runtime, displayId)),
        })),
      "exec.complete": async (position) => {
        await (completion.ready ??= pyodide.loadPackage(COMPLETION_PACKAGE, QUIET));
        return parseCompletions(runtime.complete(position));
      },
    },
    onLog: (handler) => {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };
}

/**
 * Packages download on first import, so code can use any package Pyodide offers. Code can also
 * arrive as a parameter (the custom code node runs it with `exec`), so string parameters are
 * scanned too; text that is not Python has no imports.
 */
async function loadImportedPackages(pyodide: PyodideInterface, task: Task): Promise<void> {
  if (task.kind !== "python") return;
  const sources = [task.code, ...Object.values(task.params).filter((v) => typeof v === "string")];
  for (const source of sources) await pyodide.loadPackagesFromImports(source, QUIET);
}

const importablePackages = (pyodide: PyodideInterface): string[] => [
  ...new Set([...Object.keys(pyodide.loadedPackages), ...Object.keys(pyodide.lockfile.packages)]),
];

/** Runs synchronous Pyodide work so that a thrown error rejects the request instead of escaping. */
const settle = <T>(compute: () => T): Promise<T> =>
  new Promise((resolve) => {
    resolve(compute());
  });

function runTask(
  runtime: PythonRuntime,
  listeners: LogListeners,
  { taskId, task }: ExecutorParams<"exec.run">,
): ExecutorResult<"exec.run"> {
  if (task.kind !== "python")
    throw new Error("Pyodide executor received a task for a runtime it does not announce");
  Object.values(task.inputs).forEach((resultId) => requireResult(runtime, resultId));
  const emitLog = (level: string, message: string) => {
    const log: ExecutorLog = { taskId, level: LOG_LEVELS[level] ?? "info", message };
    listeners.forEach((listener) => {
      listener(log);
    });
  };
  return parseRuntimeJson(
    ExecutorRequests["exec.run"].result,
    runtime.runTask(JSON.stringify(task), emitLog),
  );
}

function readPage(
  runtime: PythonRuntime,
  { resultId, offset, limit, sort }: ExecutorParams<"exec.page">,
): ExecutorResult<"exec.page"> {
  return parseRuntimeJson(
    DataPage,
    runtime.page({
      resultId: requireResult(runtime, resultId),
      offset,
      limit,
      sortJson: JSON.stringify(sort ?? null),
    }),
  );
}

/** pandas and pyarrow raise on malformed files; that is the user's data, so it becomes a value. */
function loadSource(
  runtime: PythonRuntime,
  format: string,
  bytes: Uint8Array,
): ExecutorResult<"exec.load"> {
  try {
    return { ok: true, ref: parseRuntimeJson(ResultRef, runtime.loadSource(format, bytes)) };
  } catch (error) {
    return {
      ok: false,
      error: sourceUnreadable({
        message: "El archivo no tiene el formato esperado.",
        detail: String(error),
      }),
    };
  }
}

/** Fails the request when the result was dropped or never existed, so the caller recomputes it. */
function requireResult(runtime: PythonRuntime, resultId: string): string {
  if (!runtime.hasResult(resultId))
    throw new RpcError(
      NepErrorCode.RESULT_EXPIRED,
      `Result ${resultId} is not held by this executor`,
    );
  return resultId;
}

function requireFigure(runtime: PythonRuntime, displayId: string): string {
  if (!runtime.hasFigure(displayId))
    throw new RpcError(
      NepErrorCode.RESULT_EXPIRED,
      `Figure ${displayId} is not held by this executor`,
    );
  return displayId;
}

function parseCompletions(text: string): ExecutorResult<"exec.complete"> {
  const answer: unknown = JSON.parse(text);
  if (typeof answer === "object" && answer !== null && "invalid" in answer)
    throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, String(answer.invalid));
  return parseRuntimeJson(CodeCompletions, text);
}

/** The Python runtime is ours, so a shape it should never produce is a bug, not a user error. */
function parseRuntimeJson<S extends TSchema>(schema: S, text: string): Static<S> {
  const parsed = parse(schema, JSON.parse(text));
  if (!parsed.ok)
    throw new Error(`Python runtime broke the protocol: ${JSON.stringify(parsed.error)}`);
  return parsed.value;
}
