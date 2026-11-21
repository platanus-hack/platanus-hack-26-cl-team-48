import type { Capabilities, DisplayRef, NodeManifest, ResultRef } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { EngineEvent } from "./engine-events.ts";
import {
  applyEvent,
  createEngineState,
  selectViewVersion,
  type EngineState,
} from "./engine-state.ts";

const ref: ResultRef = { id: "r1", rowCount: 3, schema: [{ name: "region", type: "text" }] };
const figure: DisplayRef = { id: "d1", mime: "image/png", width: 400, height: 300 };

const capabilities: Capabilities = {
  protocol: "0.1",
  engine: "mock",
  runtimes: ["sql"],
  sources: ["upload"],
};

const status = (rev: number, nodeId: string, state: "running" | "done"): EngineEvent => ({
  type: "node.status",
  payload: { rev, runId: "run_1", nodeId, state },
});

const applyAll = (state: EngineState, events: ReadonlyArray<EngineEvent>) =>
  events.reduce(applyEvent, state);

const atRevision = (rev: number) =>
  applyAll(createEngineState(), [
    { type: "flow.submitted", rev },
    { type: "run.requested", rev },
  ]);

describe("applyEvent", () => {
  it("tracks the connection lifecycle", () => {
    const connecting = applyEvent(createEngineState(), {
      type: "session.connecting",
      engineId: "mock",
    });
    const connected = applyEvent(connecting, { type: "session.connected", capabilities });

    expect(connecting.connection).toEqual({ status: "connecting", engineId: "mock" });
    expect(connected.connection).toEqual({ status: "connected", engineId: "mock", capabilities });
  });

  it("forgets everything of the previous engine when connecting to a new one", () => {
    const used = applyAll(atRevision(3), [status(3, "n1", "done")]);

    const reconnecting = applyEvent(used, { type: "session.connecting", engineId: "other" });

    expect(reconnecting.nodes).toEqual({});
    expect(reconnecting.rev).toBe(3);
  });

  it("records why the connection failed", () => {
    const state = applyAll(createEngineState(), [
      { type: "session.connecting", engineId: "mock" },
      { type: "session.failed", reason: "protocol-mismatch" },
    ]);

    expect(state.connection).toEqual({
      status: "failed",
      engineId: "mock",
      reason: "protocol-mismatch",
    });
  });

  it("stores the node catalog", () => {
    const nodes: NodeManifest[] = [];

    expect(applyEvent(createEngineState(), { type: "catalog.loaded", nodes }).catalog).toBe(nodes);
  });

  it("updates the state of a node from node.status events", () => {
    const state = applyAll(atRevision(1), [
      {
        type: "node.status",
        payload: { rev: 1, runId: "r", nodeId: "n1", state: "running", progress: 0.5 },
      },
    ]);

    expect(state.nodes["n1"]).toEqual({ state: "running", progress: 0.5 });
  });

  it("keeps the node error reported by the engine", () => {
    const error = { code: "SQL_ERROR", message: "Falló" } as const;

    const state = applyEvent(atRevision(1), {
      type: "node.status",
      payload: { rev: 1, runId: "r", nodeId: "n1", state: "error", error, executor: "mock" },
    });

    expect(state.nodes["n1"]).toEqual({ state: "error", error, executor: "mock" });
  });

  it("stores result references by node and port", () => {
    const state = applyEvent(atRevision(1), {
      type: "node.result",
      payload: { rev: 1, runId: "r", nodeId: "n1", port: "out", ref },
    });

    expect(state.results["n1"]).toEqual({ out: ref });
  });

  it("stores the figures each node showed", () => {
    const state = applyEvent(atRevision(1), {
      type: "node.display",
      payload: { rev: 1, runId: "r", nodeId: "n1", displays: [figure] },
    });

    expect(state.displays["n1"]).toEqual([figure]);
  });

  it("drops the figures of stale nodes, like their results", () => {
    const shown = applyAll(atRevision(1), [
      { type: "node.display", payload: { rev: 1, runId: "r", nodeId: "n1", displays: [figure] } },
      { type: "flow.submitted", rev: 2 },
    ]);

    const state = applyEvent(shown, { type: "flow.accepted", rev: 2, stale: ["n1"], errors: [] });

    expect(state.displays["n1"]).toBeUndefined();
  });

  it("discards events whose revision is older than the current one", () => {
    const state = atRevision(5);

    const after = applyAll(state, [
      status(4, "n1", "done"),
      { type: "node.result", payload: { rev: 4, runId: "r", nodeId: "n1", port: "out", ref } },
      { type: "flow.accepted", rev: 4, stale: [], errors: [] },
    ]);

    expect(after).toBe(state);
  });

  it("accepts events of a newer revision than the one submitted", () => {
    expect(applyEvent(atRevision(1), status(2, "n1", "done")).nodes["n1"]?.state).toBe("done");
  });

  it("marks stale nodes and drops their results when the engine accepts a flow", () => {
    const withResults = applyAll(atRevision(1), [
      { type: "node.result", payload: { rev: 1, runId: "r", nodeId: "n1", port: "out", ref } },
      { type: "node.result", payload: { rev: 1, runId: "r", nodeId: "n2", port: "out", ref } },
      { type: "flow.submitted", rev: 2 },
    ]);

    const state = applyEvent(withResults, {
      type: "flow.accepted",
      rev: 2,
      stale: ["n2"],
      errors: [{ nodeId: "n1", code: "PARAM_REQUIRED", message: "Falta", param: "column" }],
    });

    expect(state.nodes["n2"]).toEqual({ state: "stale" });
    expect(Object.keys(state.results)).toEqual(["n1"]);
    expect(state.issues).toEqual([
      { nodeId: "n1", code: "PARAM_REQUIRED", message: "Falta", param: "column" },
    ]);
  });

  it("forgets inferred schemas when a new revision is submitted", () => {
    const inferred = applyEvent(atRevision(1), {
      type: "schema.inferred",
      rev: 1,
      nodeId: "n2",
      port: "in",
      columns: [{ name: "region", type: "text" }],
    });

    expect(inferred.schemas["n2"]).toEqual({ in: [{ name: "region", type: "text" }] });
    expect(applyEvent(inferred, { type: "flow.submitted", rev: 2 }).schemas).toEqual({});
  });

  it("follows a run from request to finish", () => {
    const requested = applyEvent(atRevision(1), { type: "run.requested", rev: 1 });
    const started = applyEvent(requested, { type: "run.started", rev: 1, runId: "run_1" });
    const finished = applyEvent(started, {
      type: "run.finished",
      payload: { rev: 1, runId: "run_1", status: "done", durationMs: 4, executed: [], cached: [] },
    });

    expect(requested.run).toEqual({ status: "running" });
    expect(started.run).toEqual({ status: "running", runId: "run_1" });
    expect(finished.run).toEqual({ status: "done", runId: "run_1", durationMs: 4 });
  });

  it("keeps a finished run finished when the run.started answer arrives late", () => {
    const state = applyAll(atRevision(1), [
      { type: "run.requested", rev: 1 },
      {
        type: "run.finished",
        payload: {
          rev: 1,
          runId: "run_1",
          status: "done",
          durationMs: 4,
          executed: [],
          cached: [],
        },
      },
      { type: "run.started", rev: 1, runId: "run_1" },
    ]);

    expect(state.run).toEqual({ status: "done", runId: "run_1", durationMs: 4 });
  });

  it("does not mutate the previous state", () => {
    const before = atRevision(1);
    const snapshot = structuredClone(before);

    applyEvent(before, status(1, "n1", "running"));

    expect(before).toEqual(snapshot);
  });
});

it("cancels a running revision when a newer flow is submitted", () => {
  const running = applyEvent(atRevision(1), { type: "run.requested", rev: 1 });
  const next = applyEvent(running, { type: "flow.submitted", rev: 2 });
  expect(next.run?.status).toBe("cancelled");
});

describe("late run events", () => {
  const events: EngineEvent[] = [
    status(2, "n1", "done"),
    { type: "node.result", payload: { rev: 2, runId: "run_1", nodeId: "n1", port: "out", ref } },
    {
      type: "run.finished",
      payload: {
        rev: 2,
        runId: "run_1",
        status: "done",
        durationMs: 4,
        executed: ["n1"],
        cached: ["n2"],
      },
    },
  ];

  it.each(events)("ignores $type from another run at the same revision", (event) => {
    const current = applyAll(atRevision(2), [
      { type: "run.requested", rev: 2 },
      { type: "run.started", rev: 2, runId: "run_2" },
    ]);

    expect(applyEvent(current, event)).toBe(current);
  });

  it.each(events)("ignores $type after cancellation even at the current revision", (event) => {
    const current = applyAll(atRevision(1), [
      { type: "run.requested", rev: 1 },
      { type: "run.started", rev: 1, runId: "run_1" },
      { type: "flow.submitted", rev: 2 },
    ]);

    expect(applyEvent(current, event)).toBe(current);
  });

  it.each(events)("ignores $type at an older revision even for the current run", (event) => {
    const current = applyAll(atRevision(3), [
      { type: "run.requested", rev: 3 },
      { type: "run.started", rev: 3, runId: "run_1" },
    ]);

    expect(applyEvent(current, event)).toBe(current);
  });
});

describe("keeping what already ran", () => {
  const finishedRun = (runId: string, executed: string[], cached: string[] = []): EngineEvent[] => [
    { type: "run.requested", rev: 1 },
    { type: "run.started", rev: 1, runId },
    ...executed.map((nodeId): EngineEvent => ({
      type: "node.status",
      payload: { rev: 1, runId, nodeId, state: "done" },
    })),
    {
      type: "run.finished",
      payload: { rev: 1, runId, status: "done", durationMs: 1, executed, cached },
    },
  ];
  const ran = applyAll(atRevision(1), finishedRun("run_1", ["n1", "n2"]));

  it("keeps finished nodes while a newer revision waits for the engine", () => {
    const moved = applyEvent(ran, { type: "flow.submitted", rev: 2 });

    expect(moved.nodes["n1"]?.state).toBe("done");
    expect(selectViewVersion(moved, "n1")).toBe(selectViewVersion(ran, "n1"));
  });

  it("keeps the view of a node the engine did not mark stale", () => {
    const accepted = applyAll(ran, [
      { type: "flow.submitted", rev: 2 },
      { type: "flow.accepted", rev: 2, stale: ["n2"], errors: [] },
    ]);

    expect(selectViewVersion(accepted, "n1")).toBe(selectViewVersion(ran, "n1"));
    expect(selectViewVersion(accepted, "n2")).toBeUndefined();
  });

  it("forgets nodes still in progress when a newer revision is submitted", () => {
    const running = applyAll(atRevision(1), [
      { type: "run.started", rev: 1, runId: "run_1" },
      { type: "node.status", payload: { rev: 1, runId: "run_1", nodeId: "n1", state: "running" } },
      { type: "flow.submitted", rev: 2 },
    ]);

    expect(running.nodes["n1"]).toBeUndefined();
  });

  it("keeps the nodes another run leaves out", () => {
    const next = applyEvent(ran, { type: "run.requested", rev: 1 });

    expect(next.nodes["n1"]?.state).toBe("done");
  });

  it("keeps a node's view while later runs only reuse its cached result", () => {
    const reused = applyAll(ran, finishedRun("run_2", [], ["n1"]));

    expect(reused.nodes["n1"]?.state).toBe("cached");
    expect(selectViewVersion(reused, "n1")).toBe(selectViewVersion(ran, "n1"));
  });

  it("asks for a node's view again when it runs again", () => {
    const rerun = applyAll(ran, finishedRun("run_2", ["n1"]));

    expect(selectViewVersion(rerun, "n1")).not.toBe(selectViewVersion(ran, "n1"));
  });
});
