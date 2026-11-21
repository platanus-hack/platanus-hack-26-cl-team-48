import { JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { createHarness } from "./testing/coordinator-harness.ts";
import { edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const pipeline = (value = "1") =>
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("f", "core.filter", { column: "x", value }),
      flowNode("p", "core.python"),
    ],
    [edge("s", "f"), edge("f", "p")],
  );

const harnessWithSource = (options: Parameters<typeof createHarness>[0] = {}) =>
  createHarness({
    ...options,
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

describe("createCoordinator: flow.set", () => {
  it("answers which nodes are stale and which are misconfigured, without running", async () => {
    const { coordinator, sql } = createHarness();
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("f", "core.filter", {})],
      [edge("s", "f")],
    );

    const answer = await coordinator["flow.set"]({ rev: 1, flow });

    expect(answer).toMatchObject({
      rev: 1,
      stale: ["s", "f"],
      errors: [
        { nodeId: "f", code: "PARAM_REQUIRED", param: "column" },
        { nodeId: "f", code: "PARAM_REQUIRED", param: "value" },
      ],
    });
    expect(sql.tasks).toEqual([]);
  });

  it("reports nothing stale for a flow whose results are cached", async () => {
    const harness = harnessWithSource();
    await harness.setAndRun(pipeline(), 1);

    const answer = await harness.coordinator["flow.set"]({ rev: 2, flow: pipeline() });

    expect(answer.stale).toEqual([]);
  });
});

describe("createCoordinator: flow.run", () => {
  it("runs every node and reports queued, running and done with the revision", async () => {
    const harness = harnessWithSource();

    const runId = await harness.setAndRun(pipeline(), 7);

    expect(harness.statesOf(runId, "f")).toEqual(["queued", "running", "done"]);
    expect(harness.events("node.status").every((status) => status.rev === 7)).toBe(true);
  });

  it("emits a result reference per output port", async () => {
    const harness = harnessWithSource();

    const runId = await harness.setAndRun(pipeline(), 1);

    expect(harness.events("node.result")).toMatchObject([
      { rev: 1, runId, nodeId: "s", port: "out", ref: { rowCount: 3 } },
      { rev: 1, runId, nodeId: "f", port: "out", ref: { rowCount: 3 } },
      { rev: 1, runId, nodeId: "p", port: "out", ref: { rowCount: 3 } },
    ]);
  });

  it("sends the rendered SQL with its inputs resolved to result ids", async () => {
    const harness = harnessWithSource();

    await harness.setAndRun(pipeline(), 1);

    const sourceRef = harness.events("node.result")[0]?.ref.id;
    expect(harness.sql.tasks[1]).toEqual({
      kind: "sql",
      query: `SELECT * FROM "in" WHERE "x" = '1'`,
      inputs: { in: sourceRef },
    });
  });

  it("moves an input to the executor of the task through exec.export and exec.import", async () => {
    const harness = harnessWithSource();

    await harness.setAndRun(pipeline(), 1);

    const filterRef = harness.events("node.result")[1]?.ref.id;
    expect(harness.sql.calls).toContainEqual({
      method: "exec.export",
      params: { resultId: filterRef },
    });
    expect(harness.python.calls.map((call) => call.method)).toContain("exec.import");
    expect(harness.python.tasks[0]?.inputs["in"]).toMatch(/^fake-py-/);
  });

  it("finishes with the executed nodes and the time it took", async () => {
    const harness = harnessWithSource();

    const runId = await harness.setAndRun(pipeline(), 1);

    expect(harness.events("run.finished")).toEqual([
      expect.objectContaining({
        runId,
        rev: 1,
        status: "done",
        executed: ["s", "f", "p"],
        cached: [],
      }),
    ]);
    expect(harness.events("run.finished")[0]?.durationMs).toBeGreaterThan(0);
  });

  it("serves an unchanged node from the cache without running it again", async () => {
    const harness = harnessWithSource();
    await harness.setAndRun(pipeline(), 1);

    const runId = await harness.setAndRun(pipeline(), 2);

    expect(harness.statesOf(runId, "f")).toEqual(["cached"]);
    expect(harness.sql.tasks).toHaveLength(2);
    expect(harness.events("run.finished")[1]).toMatchObject({
      executed: [],
      cached: ["s", "f", "p"],
    });
  });

  it("reruns only the edited node and what is downstream of it", async () => {
    const harness = harnessWithSource();
    await harness.setAndRun(pipeline("1"), 1);

    await harness.setAndRun(pipeline("2"), 2);

    expect(harness.events("run.finished")[1]).toMatchObject({
      executed: ["f", "p"],
      cached: ["s"],
    });
  });

  it("releases the results that left the cache with exec.drop", async () => {
    const harness = harnessWithSource();
    await harness.setAndRun(pipeline("1"), 1);
    const oldFilterRef = harness.events("node.result")[1]?.ref.id;

    await harness.setAndRun(pipeline("2"), 2);

    expect(harness.sql.calls).toContainEqual({
      method: "exec.drop",
      params: { resultIds: [oldFilterRef] },
    });
    expect(harness.python.calls.filter((call) => call.method === "exec.drop")).toHaveLength(1);
  });

  it("leaves the nodes downstream of a failed node stale without running them", async () => {
    const harness = harnessWithSource({
      failWhen: (task) =>
        task.kind === "sql" && task.query.includes("WHERE")
          ? { code: "COLUMN_NOT_FOUND", message: "No existe la columna x" }
          : undefined,
    });

    const runId = await harness.setAndRun(pipeline(), 1);

    expect(harness.statesOf(runId, "f")).toEqual(["queued", "running", "error"]);
    expect(harness.statesOf(runId, "p")).toEqual(["queued", "stale"]);
    expect(harness.python.tasks).toEqual([]);
    expect(harness.events("run.finished")[0]).toMatchObject({ status: "error", executed: ["s"] });
  });

  it("fails the source node with the executor's error when its data cannot be loaded", async () => {
    const harness = harnessWithSource({
      loadError: { code: "SOURCE_UNREADABLE", message: "No se pudo leer v.csv" },
    });

    const runId = await harness.setAndRun(pipeline(), 1);

    expect(
      harness
        .events("node.status")
        .filter((status) => status.runId === runId && status.nodeId === "s")
        .at(-1),
    ).toMatchObject({
      state: "error",
      error: { code: "SOURCE_UNREADABLE", message: "No se pudo leer v.csv" },
    });
    expect(harness.statesOf(runId, "f")).toEqual(["queued", "stale"]);
  });

  it("reports a misconfigured node as an error when the flow runs", async () => {
    const harness = harnessWithSource();
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("f", "core.filter", {})],
      [edge("s", "f")],
    );

    const runId = await harness.setAndRun(flow, 1);

    expect(
      harness
        .events("node.status")
        .find(
          (status) => status.nodeId === "f" && status.runId === runId && status.state === "error",
        ),
    ).toMatchObject({ error: { code: "PARAM_REQUIRED" } });
  });

  it("reports nodes of an unknown type as errors", async () => {
    const harness = createHarness();

    const runId = await harness.setAndRun(flowOf([flowNode("x", "core.unknown")], []), 1);

    expect(harness.statesOf(runId, "x")).toEqual(["error"]);
    expect(harness.events("run.finished")[0]).toMatchObject({ status: "error" });
  });

  it("runs only the targets and the nodes they read from", async () => {
    const harness = harnessWithSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: pipeline() });

    await harness.run(1, ["f"]);

    expect(harness.events("run.finished")[0]).toMatchObject({ executed: ["s", "f"] });
  });

  it("rejects a run for a revision that is not the current flow", async () => {
    const harness = createHarness();
    await harness.coordinator["flow.set"]({ rev: 3, flow: pipeline() });

    await expect(harness.coordinator["flow.run"]({ rev: 2 })).rejects.toMatchObject({
      code: JsonRpcErrorCode.INVALID_PARAMS,
    });
  });

  it("marks the pending nodes cancelled when the run is cancelled", async () => {
    const harness = harnessWithSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: pipeline() });
    const release = harness.sql.holdRuns();

    const runId = (await harness.coordinator["flow.run"]({ rev: 1 })).runId;
    await harness.coordinator["run.cancel"]({ runId });
    release();
    await harness.finished(runId);

    expect(harness.statesOf(runId, "p")).toEqual(["queued", "cancelled"]);
    expect(harness.events("run.finished")[0]).toMatchObject({ runId, status: "cancelled" });
  });

  it("forwards executor logs as run.log of the node that produced them", async () => {
    const harness = harnessWithSource({ logWhileRunning: "hola" });

    const runId = await harness.setAndRun(pipeline(), 1);

    expect(harness.events("run.log")).toContainEqual({
      runId,
      nodeId: "s",
      level: "info",
      message: "hola",
    });
  });
});
