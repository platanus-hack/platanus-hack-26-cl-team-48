import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { encodePeopleTable } from "@nodomics/executor-conformance";
import { NepErrorCode, type ExecutorParams, type ResultRef } from "@nodomics/protocol";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import { createDuckDbExecutor, type DuckDbExecutorOptions } from "./duckdb-executor.ts";
import type { DuckDbConnection, DuckDbFiles } from "./duckdb-port.ts";
import type { InProcessExecutor } from "@nodomics/protocol";
import { openNodeDuckDb } from "./open-node-duckdb.ts";

const PEOPLE_CSV = new TextEncoder().encode("id,name\n1,ana\n2,bea\n");

describe("DuckDB executor", () => {
  const context: {
    executor?: InProcessExecutor;
    database?: Awaited<ReturnType<typeof openNodeDuckDb>>;
  } = {};
  const start = (options: Partial<DuckDbExecutorOptions> = {}): InProcessExecutor => {
    if (context.database === undefined) throw new Error("DuckDB not started");
    return createDuckDbExecutor({ ...context.database, ...options });
  };
  const handlers = () => (context.executor ?? start()).handlers;
  const runSql = async (query: string, inputs: Record<string, string> = {}) =>
    handlers()["exec.run"]({ taskId: "t", task: { kind: "sql", query, inputs } });
  const outputOf = async (query: string): Promise<ResultRef> => {
    const run = await runSql(query);
    if (!run.ok) throw new Error(run.error.detail);
    const out = run.outputs["out"];
    if (out === undefined) throw new Error("SQL task without output");
    return out;
  };
  const load = (
    location: ExecutorParams<"exec.load">["location"],
    format: "csv" | "json" = "csv",
  ) => handlers()["exec.load"]({ sourceId: "s", format, location });

  beforeAll(async () => {
    context.database = await openNodeDuckDb();
    context.executor = start();
  });

  it("can be built from the browser's AsyncDuckDB and its connection", () => {
    expectTypeOf<AsyncDuckDB>().toExtend<DuckDbFiles>();
    expectTypeOf<AsyncDuckDBConnection>().toExtend<DuckDbConnection>();
  });

  it("announces the sql runtime", async () => {
    await expect(handlers()["exec.hello"]({})).resolves.toEqual({
      executor: "duckdb-wasm",
      runtimes: ["sql"],
    });
  });

  it("holds no figures, since SQL draws none", async () => {
    await expect(handlers()["exec.display"]({ displayId: "d_1" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });

  it("completes no code, since it runs no Python", async () => {
    await expect(
      handlers()["exec.complete"]({ code: "import pa", line: 1, column: 9 }),
    ).resolves.toEqual({ items: [] });
  });

  it("exposes each input alias to the SQL as a table", async () => {
    const people = await handlers()["exec.import"]({ arrow: encodePeopleTable() });

    const run = await runSql("SELECT count(*) AS n FROM people;", { people: people.id });

    expect(run).toMatchObject({ ok: true, outputs: { out: { rowCount: 1 } } });
  });

  it("reports a missing column as COLUMN_NOT_FOUND with a message for the user", async () => {
    const run = await runSql("SELECT monto FROM (SELECT 1 AS id)");

    expect(run).toMatchObject({
      ok: false,
      error: {
        code: "COLUMN_NOT_FOUND",
        message: 'La columna "monto" no existe.',
        detail: expect.stringContaining("Binder Error") as unknown,
      },
    });
  });

  it("reports a qualified missing column as COLUMN_NOT_FOUND", async () => {
    const run = await runSql("SELECT t.missing FROM (SELECT 1 AS id) t");

    expect(run).toMatchObject({
      ok: false,
      error: { code: "COLUMN_NOT_FOUND", message: 'La columna "missing" no existe.' },
    });
  });

  it("reports any other SQL failure as SQL_ERROR with DuckDB's message as detail", async () => {
    const run = await runSql("SELEC 1");

    expect(run).toMatchObject({
      ok: false,
      error: { code: "SQL_ERROR", detail: expect.stringContaining("syntax error") as unknown },
    });
  });

  it("rejects a task whose input result is no longer held", async () => {
    await expect(runSql("SELECT * FROM t", { t: "gone" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });

  it("maps DuckDB types to protocol column types", async () => {
    const ref = await outputOf(
      "SELECT 1::BIGINT AS b, 1.5 AS d, 'x' AS s, true AS t, DATE '2024-01-02' AS day, [1] AS l",
    );

    expect(ref.schema.map((column) => column.type)).toEqual([
      "number",
      "number",
      "text",
      "bool",
      "date",
      "other",
    ]);
  });

  it("pages BIGINT and DECIMAL as numbers and dates as text", async () => {
    const ref = await outputOf("SELECT 7::BIGINT AS b, 1.5 AS d, DATE '2024-01-02' AS day");

    const page = await handlers()["exec.page"]({ resultId: ref.id, offset: 0, limit: 1 });

    expect(page.rows).toEqual([[7, 1.5, "2024-01-02"]]);
  });

  it("profiles a column with a single repeated value as one histogram bin", async () => {
    const ref = await outputOf("SELECT 3 AS x FROM range(4)");

    const { columns } = await handlers()["exec.profile"]({ resultId: ref.id });

    expect(columns[0]?.bins).toEqual([4]);
  });

  it("loads a JSON source from bytes", async () => {
    const json = new TextEncoder().encode('[{"x": 1}, {"x": 2}, {"x": 3}]');

    await expect(load({ kind: "bytes", bytes: json }, "json")).resolves.toMatchObject({
      ok: true,
      ref: { rowCount: 3 },
    });
  });

  it("loads a Parquet source from bytes", async () => {
    const parquet = await writeParquet("SELECT * FROM range(5) AS r(x)");

    const load = await handlers()["exec.load"]({
      sourceId: "p",
      format: "parquet",
      location: { kind: "bytes", bytes: parquet },
    });

    expect(load).toMatchObject({
      ok: true,
      ref: { rowCount: 5, schema: [{ name: "x", type: "number" }] },
    });
  });

  it("loads a source from a URL through the injected fetch", async () => {
    const executor = start({ fetch: () => Promise.resolve(new Response(PEOPLE_CSV)) });

    const load = await executor.handlers["exec.load"]({
      sourceId: "s",
      format: "csv",
      location: { kind: "url", url: "https://example.test/people.csv" },
    });

    expect(load).toMatchObject({ ok: true, ref: { rowCount: 2 } });
  });

  it("returns a URL that answers with an HTTP error as a SOURCE_UNREADABLE value", async () => {
    const executor = start({ fetch: () => Promise.resolve(new Response("", { status: 404 })) });

    const load = await executor.handlers["exec.load"]({
      sourceId: "s",
      format: "csv",
      location: { kind: "url", url: "https://example.test/missing.csv" },
    });

    expect(load).toMatchObject({ ok: false, error: { code: "SOURCE_UNREADABLE" } });
  });

  it("returns a local path, which the browser cannot read, as a SOURCE_UNREADABLE value", async () => {
    await expect(load({ kind: "path", path: "/data/people.csv" })).resolves.toMatchObject({
      ok: false,
      error: { code: "SOURCE_UNREADABLE", hint: expect.any(String) as unknown },
    });
  });
});

/** DuckDB's Node runtime writes COPY output to the real file system. */
async function writeParquet(query: string): Promise<Uint8Array> {
  const { connection } = await openNodeDuckDb();
  const directory = await mkdtemp(join(tmpdir(), "nodomics-parquet-"));
  const path = join(directory, "fixture.parquet");
  await connection.query(`COPY (${query}) TO '${path}' (FORMAT parquet)`);
  const bytes = await readFile(path);
  await rm(directory, { recursive: true });
  return bytes;
}
