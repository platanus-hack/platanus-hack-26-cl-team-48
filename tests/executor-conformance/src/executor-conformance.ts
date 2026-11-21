import {
  ExecutorCapabilities,
  NepErrorCode,
  parse,
  type ExecutorPort,
  type ResultRef,
  type Runtime,
} from "@nodomics/protocol";
import { beforeAll, describe, expect, it } from "vitest";
import {
  encodePeopleTable,
  FILTER_TASKS,
  PEOPLE_CSV,
  PEOPLE_ROWS,
  PEOPLE_SCHEMA,
} from "./conformance-fixtures.ts";

export type ExecutorUnderTest = {
  readonly name: string;
  readonly runtimes: readonly Runtime[];
  readonly create: () => Promise<ExecutorPort>;
};

const STARTUP_TIMEOUT_MS = 300_000;
const HISTOGRAM_BINS = 10;

/**
 * Registers the executor protocol conformance battery. Every executor (DuckDB-WASM, Pyodide,
 * local Python) must pass it so the coordinator can swap them freely.
 */
export function describeExecutorConformance(subject: ExecutorUnderTest): void {
  describe(`${subject.name} executor protocol conformance`, () => {
    const context: { executor?: ExecutorPort } = {};
    const executor = (): ExecutorPort => {
      if (context.executor === undefined) throw new Error("Executor not started");
      return context.executor;
    };

    beforeAll(async () => {
      context.executor = await subject.create();
    }, STARTUP_TIMEOUT_MS);

    describeCapabilities(executor, subject.runtimes);
    describeResults(executor);
    describeProfiles(executor);
    describeSources(executor);
    subject.runtimes.forEach((runtime) => {
      describeTasks(executor, runtime);
    });
  });
}

type ExecutorAccess = () => ExecutorPort;

const importPeople = (executor: ExecutorPort): Promise<ResultRef> =>
  executor.request("exec.import", { arrow: encodePeopleTable() });

function describeCapabilities(executor: ExecutorAccess, runtimes: readonly Runtime[]): void {
  it("announces its runtimes in exec.hello", async () => {
    const hello = await executor().request("exec.hello", {});

    expect(parse(ExecutorCapabilities, hello).ok).toBe(true);
    expect(hello.runtimes).toEqual(runtimes);
  });
}

function describeResults(executor: ExecutorAccess): void {
  it("imports an Arrow table as a result with its row count and schema", async () => {
    const ref = await importPeople(executor());

    expect(ref).toMatchObject({ rowCount: 4, schema: PEOPLE_SCHEMA });
  });

  it("pages a result in its original order with the total row count", async () => {
    const ref = await importPeople(executor());

    const page = await executor().request("exec.page", { resultId: ref.id, offset: 1, limit: 2 });

    expect(page).toEqual({ columns: PEOPLE_SCHEMA, rows: PEOPLE_ROWS.slice(1, 3), total: 4 });
  });

  it("pages a result sorted by a column with nulls last", async () => {
    const ref = await importPeople(executor());

    const page = await executor().request("exec.page", {
      resultId: ref.id,
      offset: 0,
      limit: 10,
      sort: { column: "name", direction: "asc" },
    });

    expect(page.rows.map((row) => row[0])).toEqual([1, 2, 4, 3]);
  });

  it("exports a result as Arrow that imports back with the same rows", async () => {
    const ref = await importPeople(executor());

    const { arrow } = await executor().request("exec.export", { resultId: ref.id });
    const copy = await executor().request("exec.import", { arrow });
    const page = await executor().request("exec.page", { resultId: copy.id, offset: 0, limit: 10 });

    expect(page.rows).toEqual(PEOPLE_ROWS);
  });

  it("rejects requests on a dropped result as expired", async () => {
    const ref = await importPeople(executor());

    await executor().request("exec.drop", { resultIds: [ref.id] });

    await expect(
      executor().request("exec.page", { resultId: ref.id, offset: 0, limit: 1 }),
    ).rejects.toMatchObject({ code: NepErrorCode.RESULT_EXPIRED });
  });

  it("ignores drops of results it does not hold", async () => {
    await expect(executor().request("exec.drop", { resultIds: ["missing"] })).resolves.toEqual({});
  });
}

function describeProfiles(executor: ExecutorAccess): void {
  it("profiles a number column with nulls, distinct values, range, mean and histogram", async () => {
    const ref = await importPeople(executor());

    const { columns } = await executor().request("exec.profile", { resultId: ref.id });

    expect(columns.find((column) => column.name === "score")).toEqual({
      name: "score",
      type: "number",
      count: 4,
      nulls: 1,
      distinct: 2,
      min: "1.5",
      max: "4.5",
      mean: 2.5,
      bins: [2, ...Array<number>(HISTOGRAM_BINS - 2).fill(0), 1],
    });
  });

  it("profiles a text column with its range and no histogram", async () => {
    const ref = await importPeople(executor());

    const { columns } = await executor().request("exec.profile", { resultId: ref.id });

    expect(columns.find((column) => column.name === "name")).toEqual({
      name: "name",
      type: "text",
      count: 4,
      nulls: 1,
      distinct: 3,
      min: "ana",
      max: "dan",
      bins: [],
    });
  });
}

function describeSources(executor: ExecutorAccess): void {
  it("loads a CSV source from bytes", async () => {
    const ref = await executor().request("exec.load", {
      sourceId: "people-csv",
      format: "csv",
      location: { kind: "bytes", bytes: PEOPLE_CSV },
    });

    expect(ref).toMatchObject({
      ok: true,
      ref: {
        rowCount: 2,
        schema: [
          { name: "id", type: "number" },
          { name: "name", type: "text" },
        ],
      },
    });
  });

  describeTextSources(executor);

  it("returns bytes that are not in the declared format as a SOURCE_UNREADABLE value", async () => {
    const load = await executor().request("exec.load", {
      sourceId: "broken-json",
      format: "json",
      location: { kind: "bytes", bytes: new TextEncoder().encode("{ this is not json") },
    });

    expect(load).toMatchObject({ ok: false, error: { code: "SOURCE_UNREADABLE" } });
  });
}

function describeTasks(executor: ExecutorAccess, runtime: Runtime): void {
  it(`runs a ${runtime} task over its inputs and returns the output result`, async () => {
    const people = await importPeople(executor());

    const run = await executor().request("exec.run", {
      taskId: `filter-${runtime}`,
      task: FILTER_TASKS[runtime](people.id),
    });

    expect(run).toMatchObject({
      ok: true,
      outputs: {
        out: {
          rowCount: 1,
          schema: [
            { name: "id", type: "number" },
            { name: "score", type: "number" },
          ],
        },
      },
    });
  });
}

function describeTextSources(executor: ExecutorAccess): void {
  it.each([
    [
      "tab",
      "id\tname\r\n1\tana\r\n2\tbea\r\n",
      [
        [1, "ana"],
        [2, "bea"],
      ],
    ],
    ["semicolon", "id;name\n1;ana\n", [[1, "ana"]]],
    ["pipe", "id|name\n1|ana\n", [[1, "ana"]]],
    ["comma", "id,name\n1,ana\n", [[1, "ana"]]],
    ["tab priority", "id;label\tname\n1\tana\n", [[1, "ana"]]],
    ["semicolon priority", "id|label;name\n1;ana\n", [[1, "ana"]]],
    ["pipe priority", "id,label|name\n1|ana\n", [[1, "ana"]]],
    [
      "lines",
      'hola\n42\ncon,comas y "comillas"\n\nfin\n',
      [["hola"], ["42"], ['con,comas y "comillas"'], [""], ["fin"]],
    ],
    ["numeric lines", "42\n007", [["42"], ["007"]]],
    ["empty", "", []],
    ["blank line", "\n", [[""]]],
    ["CRLF lines", "hola\r\n42\r\n\r\n", [["hola"], ["42"], [""]]],
  ])("loads txt %s consistently", async (_name, text, rows) => {
    const load = await executor().request("exec.load", {
      sourceId: "text-source",
      format: "txt",
      location: { kind: "bytes", bytes: new TextEncoder().encode(text) },
    });

    expect(load).toMatchObject({ ok: true, ref: { rowCount: rows.length } });
    if (!load.ok) return;
    const page = await executor().request("exec.page", {
      resultId: load.ref.id,
      offset: 0,
      limit: 100,
    });

    expect(page.rows).toEqual(rows);
    if (!text.split("\n")[0]?.match(/[\t;|,]/)) {
      expect(load.ref.schema).toEqual([{ name: "texto", type: "text" }]);
    } else {
      expect(load.ref.schema.map((column) => column.type)).toEqual(["number", "text"]);
    }
  });
}
