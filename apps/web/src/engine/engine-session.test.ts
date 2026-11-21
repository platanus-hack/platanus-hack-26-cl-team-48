import { FLOW_FORMAT, NepErrorCode, type Flow, type NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { FakeRpcError, startFakeEngine, type FakeHandlers } from "../testing/fake-engine.ts";
import { applyEvent, createEngineState } from "./engine-state.ts";
import type { EngineEvent } from "./engine-events.ts";
import { createEngineSession } from "./engine-session.ts";

const FILTER: NodeManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "" },
};

const FLOW: Flow = {
  format: FLOW_FORMAT,
  nodes: [
    { id: "n1", type: "core.filter", version: "0.1.0", params: {}, position: { x: 0, y: 0 } },
  ],
  edges: [],
};

function openSession(handlers: FakeHandlers = {}) {
  const engine = startFakeEngine(handlers);
  const events: EngineEvent[] = [];
  const session = createEngineSession({
    engineId: "mock",
    transport: engine.transport,
    dispatch: (event) => {
      events.push(event);
    },
  });
  return { engine, events, session };
}

const typesOf = (events: ReadonlyArray<EngineEvent>) => events.map((event) => event.type);

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createEngineSession", () => {
  it("connects and loads the node catalog", async () => {
    const { events, session } = openSession({ "nodes.list": () => ({ nodes: [FILTER] }) });

    await session.start();

    expect(typesOf(events)).toEqual(["session.connecting", "session.connected", "catalog.loaded"]);
    expect(events.at(-1)).toEqual({ type: "catalog.loaded", nodes: [FILTER] });
  });

  it("reports a protocol mismatch without loading the catalog", async () => {
    const { events, session } = openSession({
      "engine.hello": () => {
        throw new FakeRpcError(NepErrorCode.PROTOCOL_MISMATCH, "old", "9.0");
      },
    });

    await session.start();

    expect(events.at(-1)).toEqual({ type: "session.failed", reason: "protocol-mismatch" });
  });

  it("submits the flow and projects the engine's answer", async () => {
    const { events, session } = openSession({
      "flow.set": ({ rev }) => ({
        rev,
        stale: ["n1"],
        errors: [{ nodeId: "n1", code: "PARAM_REQUIRED", message: "Falta", param: "column" }],
      }),
    });
    await session.start();

    await session.submitFlow(4, FLOW);

    expect(events.slice(-2)).toEqual([
      { type: "flow.submitted", rev: 4 },
      {
        type: "flow.accepted",
        rev: 4,
        stale: ["n1"],
        errors: [{ nodeId: "n1", code: "PARAM_REQUIRED", message: "Falta", param: "column" }],
      },
    ]);
  });

  it("registers the flow's custom nodes before submitting it", async () => {
    const custom = {
      ...FILTER,
      id: "custom.mio",
      impl: { kind: "flow" as const, graph: { nodes: [], edges: [] } },
    };
    const { engine, session } = openSession({
      "nodes.register": () => ({}),
      "flow.set": ({ rev }) => ({ rev, stale: [], errors: [] }),
    });
    await session.start();

    await session.submitFlow(1, { ...FLOW, customNodes: [custom] });

    expect(engine.calls.slice(-2).map((call) => call.method)).toEqual([
      "nodes.register",
      "flow.set",
    ]);
  });

  it("keeps engine events that arrive before the answer to flow.run", async () => {
    const { engine, events, session } = openSession({
      "flow.run": () => {
        engine.notify("node.status", { rev: 1, runId: "run_1", nodeId: "n1", state: "done" });
        return { runId: "run_1" };
      },
    });
    await session.start();

    await session.run(1);

    expect(typesOf(events).slice(-3)).toEqual(["run.requested", "node.status", "run.started"]);
  });

  it("projects the inferred columns of a port", async () => {
    const { events, session } = openSession({
      "schema.infer": () => ({ ok: true, columns: [{ name: "region", type: "text" }] }),
    });
    await session.start();

    await session.inferSchema({ rev: 2, nodeId: "n1", port: "in" });

    expect(events.at(-1)).toEqual({
      type: "schema.inferred",
      rev: 2,
      nodeId: "n1",
      port: "in",
      columns: [{ name: "region", type: "text" }],
    });
  });

  it("ignores ports whose columns cannot be inferred yet", async () => {
    const { events, session } = openSession({
      "schema.infer": () => ({
        ok: false,
        error: { code: "INPUT_MISSING", message: "Sin entrada" },
      }),
    });
    await session.start();

    await session.inferSchema({ rev: 2, nodeId: "n1", port: "in" });

    expect(events.at(-1)?.type).toBe("catalog.loaded");
  });

  it("stops forwarding engine events once closed", async () => {
    const { engine, events, session } = openSession();
    await session.start();

    session.close();
    engine.notify("node.status", { rev: 1, runId: "run_1", nodeId: "n1", state: "done" });
    await settle();

    expect(typesOf(events)).not.toContain("node.status");
  });
});

it("returns to rest after a rejected run and allows retrying", async () => {
  const { session, events } = openSession({
    "flow.run": () => {
      throw new FakeRpcError(-32603, "failed");
    },
  });
  await session.start();
  await expect(session.run(0)).rejects.toThrow("failed");
  expect(events.reduce(applyEvent, createEngineState()).run).toBeUndefined();
  await expect(session.run(0)).rejects.toThrow("failed");
  expect(typesOf(events).filter((type) => type === "run.requested")).toHaveLength(2);
});
