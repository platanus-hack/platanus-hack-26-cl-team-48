import { afterEach, describe, expect, it, vi } from "vitest";
import { createEngineRunner } from "./engine-runner.ts";
import {
  createFakeEngine,
  edge,
  flowNode,
  flowOf,
  namedFlow,
  testCatalog,
  unwrap,
} from "./testing/runner-fixtures.ts";

const sourceFlow = () => flowOf([flowNode("a", "test.rows")], []);

function harness(options: Parameters<typeof createFakeEngine>[0] = {}) {
  const fake = createFakeEngine(options);
  return {
    ...fake,
    runner: createEngineRunner({ createExecutors: fake.createExecutors, catalog: testCatalog }),
  };
}

afterEach(() => vi.useRealTimers());

describe("engine runner", () => {
  it("returns the completed status of every node in flow order", async () => {
    const { runner } = harness();
    const flow = flowOf(
      [flowNode("b", "test.filter", { column: "n" }), flowNode("a", "test.rows")],
      [edge("a", "b")],
    );

    const result = unwrap(await runner.run(flow));

    expect(result.nodes).toEqual([
      { nodeId: "b", status: "ok", error: null },
      { nodeId: "a", status: "ok", error: null },
    ]);
  });

  it("reports a node's error message and hint", async () => {
    const { runner } = harness({
      sql: {
        failWhen: () => ({
          code: "COLUMN_NOT_FOUND",
          message: "Missing column",
          hint: "Choose another column",
        }),
      },
    });

    const result = unwrap(await runner.run(sourceFlow()));

    expect(result.nodes).toEqual([
      { nodeId: "a", status: "error", error: "Missing column (Choose another column)" },
    ]);
  });

  it("runs only the nodes required by the requested targets", async () => {
    const { runner } = harness();
    const flow = flowOf(
      [
        flowNode("a", "test.rows"),
        flowNode("b", "test.filter", { column: "n" }),
        flowNode("c", "test.rows"),
      ],
      [edge("a", "b")],
    );

    const result = unwrap(await runner.run(flow, ["b"]));

    expect(result.nodes).toEqual([
      { nodeId: "a", status: "ok", error: null },
      { nodeId: "b", status: "ok", error: null },
      { nodeId: "c", status: "skipped", error: null },
    ]);
  });

  it("reports a configuration error for a node that cannot run", async () => {
    const { runner } = harness();
    const flow = flowOf([flowNode("broken", "test.filter")], []);

    const result = unwrap(await runner.run(flow));

    expect(result.nodes).toMatchObject([{ nodeId: "broken", status: "error" }]);
    expect(typeof result.nodes[0]?.error).toBe("string");
    expect(result.nodes[0]?.error).not.toBe("");
  });

  it("treats a cached node as successful on the next run", async () => {
    const { runner, created } = harness();
    await runner.run(sourceFlow());

    const result = unwrap(await runner.run(sourceFlow()));

    expect(result.nodes).toEqual([{ nodeId: "a", status: "ok", error: null }]);
    expect(created[0]?.sql.tasks).toHaveLength(1);
  });

  it("samples rows in pages of twenty using column names", async () => {
    const { runner } = harness({ sql: { rowCount: 45 } });

    const page = unwrap(await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 1 }));

    expect(page.schema.columns).toEqual([
      { name: "n", type: "number" },
      { name: "label", type: "text" },
    ]);
    expect(page.rows).toHaveLength(20);
    expect(page.rows[0]).toEqual({ n: 20, label: "row 20" });
    expect(page.rows.at(-1)).toEqual({ n: 39, label: "row 39" });
    expect(page.page).toBe(1);
    expect(page.hasMore).toBe(true);
  });

  it("marks the last page complete", async () => {
    const { runner } = harness({ sql: { rowCount: 45 } });

    const page = unwrap(await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 2 }));

    expect(page.rows).toHaveLength(5);
    expect(page.hasMore).toBe(false);
  });

  it("runs a flow before its first sample and reuses its results afterwards", async () => {
    const { runner, created } = harness();

    await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 0 });
    await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 0 });

    expect(created[0]?.sql.tasks).toHaveLength(1);
  });

  it("returns a readable error for an unknown output port", async () => {
    const { runner } = harness();

    const result = await runner.sample(sourceFlow(), { nodeId: "a", port: "missing", page: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("missing");
  });

  it("includes a failed node's error in its sample error", async () => {
    const { runner } = harness({
      sql: { failWhen: () => ({ code: "COLUMN_NOT_FOUND", message: "Missing column" }) },
    });

    const result = await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Missing column");
  });

  it("caps serialized sample rows at 64 KB and reports more data", async () => {
    const { runner } = harness({ sql: { rowCount: 20, label: () => "á".repeat(8000) } });

    const page = unwrap(await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 0 }));

    expect(Buffer.byteLength(JSON.stringify(page.rows))).toBeLessThanOrEqual(64 * 1024);
    expect(page.rows.length).toBeGreaterThan(0);
    expect(page.rows.length).toBeLessThan(20);
    expect(page.hasMore).toBe(true);
  });

  it("returns Python logs and runs the flow when necessary", async () => {
    const { runner } = harness({ python: { logWhileRunning: "Processing rows" } });
    const flow = flowOf(
      [flowNode("a", "test.rows"), flowNode("py", "test.python")],
      [edge("a", "py")],
    );

    const result = unwrap(await runner.logs(flow, "py"));

    expect(result).toEqual({ nodeId: "py", lines: ["Processing rows"] });
  });

  it("returns an empty log list for a non-Python node", async () => {
    const { runner } = harness();

    expect(unwrap(await runner.logs(sourceFlow(), "a"))).toEqual({ nodeId: "a", lines: [] });
  });

  it("returns a readable error for logs of a nonexistent node", async () => {
    const { runner } = harness();

    const result = await runner.logs(sourceFlow(), "missing");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("missing");
  });

  it("reuses executors for the same revision and creates them for a new revision", async () => {
    const { runner, created } = harness();

    await runner.run(namedFlow("one"));
    await runner.run(namedFlow("one"));
    await runner.run(namedFlow("two"));

    expect(created).toHaveLength(2);
  });

  it("evicts the least recently used revision after four entries", async () => {
    const { runner, created, disposed } = harness();
    for (const name of ["one", "two", "three", "four"]) await runner.run(namedFlow(name));
    await runner.run(namedFlow("one"));

    await runner.run(namedFlow("five"));

    expect(disposed).toEqual([1]);
    await runner.run(namedFlow("two"));
    expect(created).toHaveLength(6);
  });

  it("returns executor initialization failures as values", async () => {
    const { runner } = harness({ createFails: new Error("Cannot initialize executor") });

    const result = await runner.run(sourceFlow());

    expect(result).toEqual({ ok: false, error: { message: "Cannot initialize executor" } });
  });

  it("returns an executor run exception without rejecting", async () => {
    const { runner } = harness({ sql: { runThrows: new Error("Executor crashed") } });

    const result = await runner.run(sourceFlow());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Executor crashed");
  });

  it("returns sample failures as values", async () => {
    const { runner } = harness({ sql: { pageThrows: new Error("Cannot read page") } });

    const result = await runner.sample(sourceFlow(), { nodeId: "a", port: "out", page: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Cannot read page");
  });

  it("times out a stalled execution after 120 seconds", async () => {
    vi.useFakeTimers();
    const { runner } = harness({ sql: { hangRuns: true } });

    const result = runner.run(sourceFlow());
    await vi.advanceTimersByTimeAsync(120_001);

    expect(await result).toEqual({ ok: false, error: { message: "Run timed out" } });
  });
});
