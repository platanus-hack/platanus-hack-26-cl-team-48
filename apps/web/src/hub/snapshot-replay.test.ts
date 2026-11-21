import { encodeFigure, SNAPSHOT_FORMAT, type Snapshot } from "@nodomics/hub";
import type {
  DataPage,
  DataProfile,
  DisplayContent,
  DisplayRef,
  Flow,
  NepResult,
  ResultRef,
} from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import {
  BAR,
  CATALOG,
  FILTER,
  JOIN,
  manifestOf,
  nodeOf,
  PYTHON,
  SAMPLE,
  flowOf,
} from "../canvas/canvas-fixtures.ts";
import type { EngineSession, PageRequest } from "../engine/engine-session.ts";
import { createEngineState, type EngineState } from "../engine/engine-state.ts";
import { createReplaySession, recordSnapshot, snapshotEngineState } from "./snapshot-replay.ts";

type ViewData = NepResult<"data.view">;

const COLUMNS = [
  { name: "region", type: "text" },
  { name: "total", type: "number" },
] as const satisfies DataPage["columns"];

const SAMPLE_REF: ResultRef = { id: "r_s", rowCount: 250, schema: [...COLUMNS] };
const FILTER_REF: ResultRef = { id: "r_f", rowCount: 3, schema: [...COLUMNS] };
const FIGURE_REF: DisplayRef = { id: "d_p", mime: "image/png", width: 4, height: 3 };

const SAMPLE_PAGE: DataPage = { columns: [...COLUMNS], rows: [["norte", 10]], total: 250 };
const FILTER_PAGE: DataPage = { columns: [...COLUMNS], rows: [["sur", 5]], total: 3 };
const PAGES: Readonly<Record<string, DataPage>> = { r_s: SAMPLE_PAGE, r_f: FILTER_PAGE };
const PROFILE: DataProfile = {
  columns: [{ name: "total", type: "number", count: 3, nulls: 0, distinct: 3, bins: [1, 2] }],
};
const VIEW: ViewData = { spec: { mark: "bar" }, rowCount: 3, sampled: false };
const FIGURE: DisplayContent = { mime: "image/png", bytes: new Uint8Array([137, 80, 78, 71, 0]) };

const INNER = manifestOf("mine.ventas", {
  impl: { kind: "flow", graph: { nodes: [nodeOf("j", JOIN.id)], edges: [] } },
});

/** sample s → filter f, f2 → bar b; python p; a custom flow node m that uses a join inside. */
const flow: Flow = {
  ...flowOf([
    nodeOf("s", SAMPLE.id),
    nodeOf("f", FILTER.id),
    nodeOf("f2", FILTER.id),
    nodeOf("b", BAR.id),
    nodeOf("p", PYTHON.id),
    nodeOf("m", INNER.id),
  ]),
  customNodes: [INNER],
};

const engine: EngineState = {
  ...createEngineState(),
  catalog: CATALOG,
  nodes: {
    s: { state: "done", progress: 1, executor: "duckdb", resultRun: "run_1" },
    f: { state: "cached", resultRun: "run_1" },
    p: { state: "error", error: { code: "PYTHON_EXCEPTION", message: "Falló" }, executor: "py" },
  },
  results: { s: { out: SAMPLE_REF }, f: { out: FILTER_REF } },
  displays: { p: [FIGURE_REF] },
  schemas: { f: { out: [...COLUMNS] } },
};

type Answers = {
  readonly pages?: Readonly<Record<string, DataPage>>;
  readonly profiles?: Readonly<Record<string, DataProfile>>;
  readonly views?: Readonly<Record<string, ViewData>>;
  readonly figures?: Readonly<Record<string, DisplayContent>>;
};

type FakeSession = EngineSession & {
  readonly pageRequests: Array<{ readonly ref: string; readonly request: PageRequest }>;
  readonly viewRequests: string[];
};

const answerOf = <T>(answers: Readonly<Record<string, T>> | undefined, key: string): Promise<T> => {
  const answer = answers?.[key];
  return answer === undefined ? Promise.reject(new Error(`no ${key}`)) : Promise.resolve(answer);
};

function fakeSession(answers: Answers): FakeSession {
  const pageRequests: FakeSession["pageRequests"] = [];
  const viewRequests: string[] = [];
  return {
    pageRequests,
    viewRequests,
    start: () => Promise.resolve(),
    submitFlow: () => Promise.resolve(),
    run: () => Promise.resolve(),
    inferSchema: () => Promise.resolve(),
    page: (ref, request) => {
      pageRequests.push({ ref, request });
      return answerOf(answers.pages, ref);
    },
    profile: (ref) => answerOf(answers.profiles, ref),
    view: (nodeId) => {
      viewRequests.push(nodeId);
      return answerOf(answers.views, nodeId);
    },
    display: (ref) => answerOf(answers.figures, ref),
    complete: () => Promise.resolve({ items: [] }),
    addSource: () => Promise.reject(new Error("not available")),
    registerNodes: () => Promise.resolve(),
    close: () => undefined,
  };
}

const ALL_ANSWERS: Answers = {
  pages: PAGES,
  profiles: { r_s: PROFILE, r_f: PROFILE },
  views: { b: VIEW },
  figures: { d_p: FIGURE },
};

const record = (includeState: boolean, session: EngineSession = fakeSession(ALL_ANSWERS)) =>
  recordSnapshot({ flow, engine, session, includeState });

describe("recordSnapshot", () => {
  it("marks the snapshot with its format", async () => {
    const snapshot = await record(false);

    expect(snapshot.format).toBe(SNAPSHOT_FORMAT);
  });

  it("keeps the manifests the flow and its custom flow nodes use, in catalog order, once", async () => {
    const snapshot = await record(false);

    expect(snapshot.catalog).toEqual([SAMPLE, FILTER, JOIN, BAR, PYTHON]);
  });

  it("records no state when it is not asked for", async () => {
    const snapshot = await record(false);

    expect(snapshot).not.toHaveProperty("state");
  });

  it("asks the engine nothing when the state is not asked for", async () => {
    const session = fakeSession(ALL_ANSWERS);

    await record(false, session);

    expect([session.pageRequests, session.viewRequests]).toEqual([[], []]);
  });

  it("records each node's state and error, without the rest of its run", async () => {
    const snapshot = await record(true);

    expect(snapshot.state?.nodes).toEqual({
      s: { state: "done" },
      f: { state: "cached" },
      p: { state: "error", error: { code: "PYTHON_EXCEPTION", message: "Falló" } },
    });
  });

  it("records the engine's results, displays and schemas", async () => {
    const snapshot = await record(true);

    expect({
      results: snapshot.state?.results,
      displays: snapshot.state?.displays,
      schemas: snapshot.state?.schemas,
    }).toEqual({ results: engine.results, displays: engine.displays, schemas: engine.schemas });
  });

  it("records the first page of at most 100 rows of each result", async () => {
    const session = fakeSession(ALL_ANSWERS);

    const snapshot = await record(true, session);

    expect(snapshot.state?.pages).toEqual(PAGES);
    expect(session.pageRequests).toEqual(
      expect.arrayContaining([
        { ref: "r_s", request: { offset: 0, limit: 100 } },
        { ref: "r_f", request: { offset: 0, limit: 100 } },
      ]),
    );
  });

  it("records the profile of each result", async () => {
    const snapshot = await record(true);

    expect(snapshot.state?.profiles).toEqual({ r_s: PROFILE, r_f: PROFILE });
  });

  it("records the view of each view node only", async () => {
    const session = fakeSession(ALL_ANSWERS);

    const snapshot = await record(true, session);

    expect(snapshot.state?.views).toEqual({ b: VIEW });
    expect(session.viewRequests).toEqual(["b"]);
  });

  it("records each figure as encoded text", async () => {
    const snapshot = await record(true);

    expect(snapshot.state?.figures).toEqual({ d_p: encodeFigure(FIGURE) });
  });

  it("leaves out what the engine refuses to answer", async () => {
    const session = fakeSession({ ...ALL_ANSWERS, pages: { r_f: FILTER_PAGE } });

    const snapshot = await record(true, session);

    expect(snapshot.state?.pages).toEqual({ r_f: FILTER_PAGE });
  });

  it("records an empty state when the engine answers nothing", async () => {
    const snapshot = await record(true, fakeSession({}));

    expect(snapshot.state).toMatchObject({ pages: {}, profiles: {}, views: {}, figures: {} });
  });
});

const ROWS: ReadonlyArray<ReadonlyArray<unknown>> = [
  ["c", 10],
  ["a", 2],
  ["d", null],
  ["b", 30],
  ["e", 1],
];

const recorded: Snapshot = {
  format: SNAPSHOT_FORMAT,
  catalog: [SAMPLE, BAR],
  state: {
    nodes: { s: { state: "done" } },
    results: { s: { out: { id: "r_s", rowCount: 5000, schema: [...COLUMNS] } } },
    displays: { p: [FIGURE_REF] },
    schemas: { s: { out: [...COLUMNS] } },
    pages: {
      r_s: {
        columns: [
          { name: "letter", type: "text" },
          { name: "amount", type: "number" },
        ],
        rows: ROWS.map((row) => [...row]),
        total: 5000,
      },
    },
    profiles: { r_s: PROFILE },
    views: { b: VIEW },
    figures: { d_p: encodeFigure(FIGURE) },
  },
};

const withoutState: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [SAMPLE] };

describe("snapshotEngineState", () => {
  it("builds the engine state the snapshot recorded", () => {
    const state = snapshotEngineState(recorded);

    expect(state).toEqual({
      ...createEngineState(),
      catalog: recorded.catalog,
      nodes: recorded.state?.nodes,
      results: recorded.state?.results,
      displays: recorded.state?.displays,
      schemas: recorded.state?.schemas,
    });
  });

  it("builds an engine state with only the catalog when nothing else was recorded", () => {
    const state = snapshotEngineState(withoutState);

    expect(state).toEqual({ ...createEngineState(), catalog: [SAMPLE] });
  });
});

describe("createReplaySession", () => {
  const session = createReplaySession(recorded);

  it("answers a page from the recorded rows", async () => {
    const page = await session.page("r_s", { offset: 1, limit: 2 });

    expect(page.rows).toEqual([
      ["a", 2],
      ["d", null],
    ]);
  });

  it("answers the recorded columns", async () => {
    const page = await session.page("r_s", { offset: 0, limit: 100 });

    expect(page.columns).toEqual(recorded.state?.pages["r_s"]?.columns);
  });

  it("counts only the recorded rows, so paging stops where the snapshot ends", async () => {
    const page = await session.page("r_s", { offset: 0, limit: 100 });

    expect(page.total).toBe(5);
  });

  it("answers no rows past the recorded ones", async () => {
    const page = await session.page("r_s", { offset: 100, limit: 100 });

    expect(page.rows).toEqual([]);
  });

  it("sorts numbers numerically, ascending, with nulls last", async () => {
    const page = await session.page("r_s", {
      offset: 0,
      limit: 100,
      sort: { column: "amount", direction: "asc" },
    });

    expect(page.rows.map(([letter]) => letter)).toEqual(["e", "a", "c", "b", "d"]);
  });

  it("sorts numbers numerically, descending, with nulls last", async () => {
    const page = await session.page("r_s", {
      offset: 0,
      limit: 100,
      sort: { column: "amount", direction: "desc" },
    });

    expect(page.rows.map(([letter]) => letter)).toEqual(["b", "c", "a", "e", "d"]);
  });

  it("sorts text and then slices the sorted rows", async () => {
    const page = await session.page("r_s", {
      offset: 1,
      limit: 2,
      sort: { column: "letter", direction: "desc" },
    });

    expect(page.rows.map(([letter]) => letter)).toEqual(["d", "c"]);
  });

  it("does not reorder the recorded rows when sorting", async () => {
    await session.page("r_s", {
      offset: 0,
      limit: 100,
      sort: { column: "amount", direction: "asc" },
    });

    const page = await session.page("r_s", { offset: 0, limit: 100 });

    expect(page.rows).toEqual(ROWS);
  });

  it("answers the recorded profile", async () => {
    const profile = await session.profile("r_s");

    expect(profile).toEqual(PROFILE);
  });

  it("answers the recorded view", async () => {
    const view = await session.view("b");

    expect(view).toEqual(VIEW);
  });

  it("answers the recorded figure decoded back to its bytes", async () => {
    const figure = await session.display("d_p");

    expect({ mime: figure.mime, bytes: [...figure.bytes] }).toEqual({
      mime: "image/png",
      bytes: [...FIGURE.bytes],
    });
  });

  it.each([
    ["a page", () => session.page("r_missing", { offset: 0, limit: 100 })],
    ["a profile", () => session.profile("r_missing")],
    ["a view", () => session.view("missing")],
    ["a figure", () => session.display("d_missing")],
  ])("refuses %s it did not record", async (_question, ask) => {
    await expect(ask()).rejects.toBeDefined();
  });

  it.each([
    ["a page", () => createReplaySession(withoutState).page("r_s", { offset: 0, limit: 100 })],
    ["a profile", () => createReplaySession(withoutState).profile("r_s")],
    ["a view", () => createReplaySession(withoutState).view("b")],
    ["a figure", () => createReplaySession(withoutState).display("d_p")],
  ])("refuses %s when the snapshot has no state", async (_question, ask) => {
    await expect(ask()).rejects.toBeDefined();
  });

  it("accepts flows, runs, schema questions and node registrations without doing anything", async () => {
    const accepted = Promise.all([
      session.start(),
      session.submitFlow(1, flow),
      session.run(1, ["s"]),
      session.inferSchema({ rev: 1, nodeId: "s", port: "out" }),
      session.registerNodes([INNER]),
    ]);

    await expect(accepted).resolves.toBeDefined();
  });

  it("completes code with no suggestions", async () => {
    const completions = await session.complete({ nodeId: "p", code: "df.", line: 1, column: 3 });

    expect(completions).toEqual({ items: [] });
  });

  it("refuses to add a source", async () => {
    const added = session.addSource({ name: "ventas.csv", file: new Uint8Array([1]) });

    await expect(added).rejects.toBeDefined();
  });

  it("closes without failing", () => {
    expect(() => {
      session.close();
    }).not.toThrow();
  });
});
