import type { ResultRef } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { SAMPLE } from "../canvas/canvas-fixtures.ts";
import { startFakeEngine, type FakeEngine } from "../testing/fake-engine.ts";
import { openConnection } from "./open-connection.ts";

const REF: ResultRef = { id: "r1", rowCount: 2, schema: [{ name: "region", type: "text" }] };

/** A fake engine that runs every node at once and reports it through NEP events. */
function startRunningEngine(): FakeEngine {
  const engine: FakeEngine = startFakeEngine({
    "nodes.list": () => ({ nodes: [SAMPLE] }),
    "flow.set": ({ rev, flow }) => ({ rev, stale: flow.nodes.map((n) => n.id), errors: [] }),
    "flow.run": ({ rev }) => {
      engine.notify("node.status", { rev, runId: "run_1", nodeId: "src", state: "running" });
      engine.notify("node.status", { rev, runId: "run_1", nodeId: "src", state: "done" });
      engine.notify("node.result", { rev, runId: "run_1", nodeId: "src", port: "out", ref: REF });
      engine.notify("run.finished", {
        rev,
        runId: "run_1",
        status: "done",
        durationMs: 3,
        executed: ["src"],
        cached: [],
      });
      return { runId: "run_1" };
    },
    "data.page": () => ({ columns: REF.schema, rows: [["Sur"], ["Norte"]], total: 2 }),
  });
  return engine;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("interface ↔ engine session", () => {
  it("connects, sends the flow, runs it, mirrors the events and pages the result", async () => {
    const engine = startRunningEngine();
    const stores = createAppStores();
    stores.flowStore.getState().dispatch({
      type: "node.add",
      node: { id: "src", type: SAMPLE.id, version: "0.1.0", params: {}, position: { x: 0, y: 0 } },
    });
    const opened = openConnection({
      entry: { id: "fake", label: "Fake", badge: "browser", connect: () => engine.transport },
      stores,
      timers: { set: () => 0, clear: () => undefined },
      onError: () => undefined,
    });

    const connection = await opened.ready;
    await connection?.session.run(stores.flowStore.getState().state.rev);
    await settle();
    const page = await connection?.session.page(REF.id, { offset: 0, limit: 100 });

    const { state } = stores.engineStore.getState();
    expect(state.catalog.map((manifest) => manifest.id)).toEqual([SAMPLE.id]);
    expect(state.nodes["src"]).toEqual({ state: "done", resultRun: "run_1" });
    expect(state.results["src"]).toEqual({ out: REF });
    expect(state.run).toEqual({ status: "done", runId: "run_1", durationMs: 3 });
    expect(page?.rows).toEqual([["Sur"], ["Norte"]]);
    expect(engine.calls.map((call) => call.method)).toEqual([
      "engine.hello",
      "nodes.list",
      "flow.set",
      "flow.run",
      "data.page",
    ]);
    opened.close();
  });
});
