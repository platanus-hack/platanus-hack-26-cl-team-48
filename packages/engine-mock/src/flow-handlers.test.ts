import { JsonRpcErrorCode } from "@nodomics/rpc";
import { describe, expect, it } from "vitest";
import { connectTestClient, type TestClient } from "./testing/connect-test-client.ts";
import {
  edgeOf,
  flowOf,
  nodeOf,
  resultRefOf,
  sourceNode,
  traceOf,
} from "./testing/flow-fixtures.ts";
import { createManualScheduler } from "./testing/manual-scheduler.ts";

const filterNode = (id: string) =>
  nodeOf(id, "core.filter", { column: "region", op: "=", value: "Norte" });

const sourceThenFilter = flowOf([filterNode("n2"), sourceNode("n1")], [edgeOf("n1", "n2")]);

const runToEnd = async (client: TestClient) => {
  const finished = new Promise((resolve) => client.peer.on("run.finished", resolve));
  const { runId } = await client.request("flow.run", { rev: 7 });
  await finished;
  return runId;
};

describe("flow.set", () => {
  it("marks every node stale under the given revision", async () => {
    const client = connectTestClient();

    const answer = await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    expect(answer).toEqual({ rev: 7, stale: ["n2", "n1"], errors: [] });
  });

  it("reports PARAM_REQUIRED for each missing required param", async () => {
    const client = connectTestClient();
    const flow = flowOf([nodeOf("n3", "core.filter", { column: "region" })]);

    const { errors } = await client.request("flow.set", { rev: 1, flow });

    expect(errors).toEqual([
      expect.objectContaining({ nodeId: "n3", code: "PARAM_REQUIRED", param: "value" }),
    ]);
  });

  it("reports UNKNOWN_NODE_TYPE for a type outside the catalog", async () => {
    const client = connectTestClient();
    const flow = flowOf([nodeOf("n9", "core.teleport")]);

    const { errors } = await client.request("flow.set", { rev: 1, flow });

    expect(errors).toEqual([expect.objectContaining({ nodeId: "n9", code: "UNKNOWN_NODE_TYPE" })]);
  });

  it("knows nodes registered during the session", async () => {
    const client = connectTestClient();
    const { nodes } = await client.request("nodes.list", {});
    await client.request("nodes.register", {
      nodes: nodes.map((manifest) => ({ ...manifest, id: `custom.${manifest.id}` })),
    });
    const flow = flowOf([nodeOf("n1", "custom.core.source.csv", { sourceId: "src_ventas" })]);

    const { errors } = await client.request("flow.set", { rev: 1, flow });

    expect(errors).toEqual([]);
  });
});

describe("flow.run", () => {
  it.each([
    { targets: ["a"], executed: ["a"] },
    { targets: ["c"], executed: ["a", "middle", "c"] },
    { targets: ["a", "c"], executed: ["a", "middle", "c"] },
    { targets: [], executed: [] },
  ])(
    "runs only targets $targets and their upstream dependencies",
    async ({ targets, executed }) => {
      const scheduler = createManualScheduler();
      const client = connectTestClient({ schedule: scheduler.schedule });
      await client.request("flow.set", {
        rev: 7,
        flow: flowOf(
          [filterNode("c"), sourceNode("a"), sourceNode("b"), filterNode("middle")],
          [edgeOf("a", "middle"), edgeOf("middle", "c")],
        ),
      });

      await client.request("flow.run", { rev: 7, targets });
      scheduler.runAll();
      await client.drain();

      expect(client.events.at(-1)).toMatchObject({
        event: "run.finished",
        payload: { executed, status: "done" },
      });
      expect(
        new Set(
          client.events.flatMap(({ payload }) => ("nodeId" in payload ? [payload.nodeId] : [])),
        ),
      ).toEqual(new Set(executed));
    },
  );

  it.each([6, 8])("rejects revision %s when the latest flow revision is 7", async (rev) => {
    const scheduler = createManualScheduler();
    const client = connectTestClient({ schedule: scheduler.schedule });
    await client.request("flow.set", { rev: 6, flow: flowOf([sourceNode("old")]) });
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    const run = client.request("flow.run", { rev });
    await expect(run).rejects.toMatchObject({ code: JsonRpcErrorCode.INVALID_PARAMS });
    await expect(run).rejects.toHaveProperty(
      "message",
      expect.stringMatching(/revision.*(mismatch|match)/i),
    );
    scheduler.runAll();
    await client.drain();

    expect(client.events).toEqual([]);
  });

  it("emits status and results in topological order, then finishes", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    await runToEnd(client);

    expect(traceOf(client.events)).toEqual([
      "status:n1:queued",
      "status:n2:queued",
      "status:n1:running",
      "status:n1:done",
      "result:n1:out",
      "status:n2:running",
      "status:n2:done",
      "result:n2:out",
      "finished:done",
    ]);
  });

  it("tags every event with the current revision and the run id", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    const runId = await runToEnd(client);

    expect(
      new Set(
        client.events.map(
          ({ payload }) => `${"rev" in payload ? String(payload.rev) : "-"}/${payload.runId}`,
        ),
      ),
    ).toEqual(new Set([`7/${runId}`]));
  });

  it("emits only events that match the NEP schemas", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    await runToEnd(client);

    expect(client.invalidEvents).toEqual([]);
  });

  it("points a source at the fixed ventas dataset", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    await runToEnd(client);

    expect(resultRefOf(client.events, "n1")).toMatchObject({
      rowCount: 50,
      schema: [
        { name: "fecha", type: "date" },
        { name: "region", type: "text" },
        { name: "producto", type: "text" },
        { name: "unidades", type: "number" },
        { name: "precio", type: "number" },
      ],
    });
  });

  it("gives a simple filter the real subset of its input", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });
    await runToEnd(client);
    const page = await client.request("data.page", {
      ref: resultRefOf(client.events, "n1")?.id ?? "",
      offset: 0,
      limit: 1000,
    });

    const norte = page.rows.filter((row) => row[1] === "Norte").length;

    expect(norte).toBeGreaterThan(0);
    expect(resultRefOf(client.events, "n2")?.rowCount).toBe(norte);
  });

  it("reports an unknown node type as a node error, not a request error", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: flowOf([nodeOf("n9", "core.teleport")]) });

    await runToEnd(client);

    expect(traceOf(client.events)).toEqual([
      "status:n9:queued",
      "status:n9:running",
      "status:n9:error",
      "finished:error",
    ]);
  });

  it("returns a new run id for each run", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });

    const first = await runToEnd(client);
    const second = await runToEnd(client);

    expect(first).not.toBe(second);
  });
});

describe("run.cancel", () => {
  it("marks every pending node cancelled and finishes the run as cancelled", async () => {
    const scheduler = createManualScheduler();
    const client = connectTestClient({ schedule: scheduler.schedule });
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });
    const { runId } = await client.request("flow.run", { rev: 7 });
    Array.from({ length: 5 }, scheduler.runNext);

    await client.request("run.cancel", { runId });
    scheduler.runAll();
    await client.drain();

    expect(traceOf(client.events)).toEqual([
      "status:n1:queued",
      "status:n2:queued",
      "status:n1:running",
      "status:n1:done",
      "result:n1:out",
      "status:n2:cancelled",
      "finished:cancelled",
    ]);
  });

  it("ignores runs that already finished", async () => {
    const client = connectTestClient();
    await client.request("flow.set", { rev: 7, flow: sourceThenFilter });
    const runId = await runToEnd(client);

    await client.request("run.cancel", { runId });
    await client.drain();

    expect(traceOf(client.events).filter((step) => step.startsWith("finished"))).toEqual([
      "finished:done",
    ]);
  });
});
