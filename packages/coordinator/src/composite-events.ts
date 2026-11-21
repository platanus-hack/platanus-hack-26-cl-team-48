import type { NepEvent, NepEventPayload, NodeState } from "@nodomics/protocol";
import type { CacheKeys } from "./cache-keys.ts";
import type { EngineState, RunContext } from "./engine-state.ts";
import type { CompositeProjection } from "./flat-graph.ts";

type Observers = { [E in NepEvent]?: (payload: NepEventPayload<E>) => void };
type Progress = {
  readonly projection: CompositeProjection;
  readonly states: ReadonlyMap<string, NodeState>;
  readonly state: NodeState;
};

export function withCompositeEvents(
  state: EngineState,
  run: RunContext,
  keys: CacheKeys,
): EngineState {
  const groups = createProgress(run, keys);
  groups.forEach((group) => {
    emitGroupStatus(state, group.projection, {
      rev: run.rev,
      runId: run.runId,
      nodeId: group.projection.id,
      state: "queued",
    });
  });
  const observers = createObservers(state, groups);
  return {
    ...state,
    emit: (event, payload) => {
      state.emit(event, payload);
      observers[event]?.(payload);
    },
  };
}

function createProgress(run: RunContext, keys: CacheKeys): Progress[] {
  const reported = new Set([...keys.keys(), ...run.analysis.issues.map((issue) => issue.nodeId)]);
  return (run.analysis.graph.composites ?? [])
    .map((projection) => ({
      ...projection,
      nodes: projection.nodes.filter((id) => reported.has(id)),
    }))
    .filter((projection) => projection.nodes.length > 0)
    .map((projection) => ({ projection, states: new Map(), state: "queued" }));
}

function createObservers(state: EngineState, groups: ReadonlyArray<Progress>): Observers {
  let progress = groups;
  return {
    "node.status": (status) => {
      progress = progress.map((group) => updateGroupStatus(state, group, status));
    },
    "node.result": (result) => {
      groups.forEach(({ projection }) => {
        projectResult(state, projection, result);
      });
    },
    // Only the composite is drawn, so what its code nodes show is shown on it.
    "node.display": (display) => {
      groups
        .filter(({ projection }) => projection.nodes.includes(display.nodeId))
        .forEach(({ projection }) => {
          state.emit("node.display", { ...display, nodeId: projection.id });
        });
    },
  };
}

function updateGroupStatus(
  state: EngineState,
  group: Progress,
  status: NepEventPayload<"node.status">,
): Progress {
  if (!group.projection.nodes.includes(status.nodeId)) return group;
  const updated = { ...group, states: new Map([...group.states, [status.nodeId, status.state]]) };
  const next = aggregateState(updated);
  if (next !== group.state) emitGroupStatus(state, group.projection, { ...status, state: next });
  return { ...updated, state: next };
}

function emitGroupStatus(
  state: EngineState,
  projection: CompositeProjection,
  status: NepEventPayload<"node.status">,
): void {
  state.emit("node.status", { ...status, nodeId: projection.id });
}

function projectResult(
  state: EngineState,
  projection: CompositeProjection,
  result: NepEventPayload<"node.result">,
): void {
  projection.outputs.forEach((from, port) => {
    if (from.node === result.nodeId && from.port === result.port)
      state.emit("node.result", { ...result, nodeId: projection.id, port });
  });
}

function aggregateState(group: Progress): NodeState {
  const states = [...group.states.values()];
  if (states.includes("error")) return "error";
  if (states.includes("running")) return "running";
  if (hasAllStates(group, ["done", "cached"]))
    return states.every((state) => state === "cached") ? "cached" : "done";
  if (states.includes("cancelled")) return "cancelled";
  if (hasAllStates(group, ["done", "cached", "stale"])) return "stale";
  return group.state;
}

const hasAllStates = (group: Progress, states: ReadonlyArray<NodeState>): boolean =>
  group.projection.nodes.every((id) => {
    const current = group.states.get(id);
    return current !== undefined && states.includes(current);
  });
