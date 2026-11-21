import type {
  Capabilities,
  Column,
  ConfigIssue,
  DisplayRef,
  NodeError,
  NodeManifest,
  NodeState,
  ResultRef,
} from "@nodomics/protocol";
import type { ConnectionFailure, EngineEvent } from "./engine-events.ts";

export type Connection =
  | { readonly status: "idle" }
  | { readonly status: "connecting"; readonly engineId: string }
  | {
      readonly status: "connected";
      readonly engineId: string;
      readonly capabilities: Capabilities;
    }
  | { readonly status: "failed"; readonly engineId: string; readonly reason: ConnectionFailure };

export type NodeRun = {
  readonly state: NodeState;
  readonly progress?: number;
  readonly error?: NodeError;
  readonly executor?: string;
  /** The run that produced the result the node shows; its view is asked for again when it changes. */
  readonly resultRun?: string;
};

export type RunSummary = {
  readonly status: "running" | "done" | "error" | "cancelled";
  readonly runId?: string;
  readonly durationMs?: number;
};

/** The interface's mirror of the engine, built only by projecting engine events. */
export type EngineState = {
  readonly connection: Connection;
  readonly catalog: ReadonlyArray<NodeManifest>;
  readonly rev: number;
  readonly acceptedRev: number | undefined;
  readonly nodes: Readonly<Record<string, NodeRun>>;
  readonly results: Readonly<Record<string, Readonly<Record<string, ResultRef>>>>;
  /** The figures each node showed, in the order it showed them. */
  readonly displays: Readonly<Record<string, ReadonlyArray<DisplayRef>>>;
  readonly schemas: Readonly<Record<string, Readonly<Record<string, ReadonlyArray<Column>>>>>;
  readonly issues: ReadonlyArray<ConfigIssue>;
  readonly run: RunSummary | undefined;
};

export const createEngineState = (): EngineState => ({
  connection: { status: "idle" },
  catalog: [],
  rev: 0,
  acceptedRev: undefined,
  nodes: {},
  results: {},
  displays: {},
  schemas: {},
  issues: [],
  run: undefined,
});

type EventOf<T extends EngineEvent["type"]> = Extract<EngineEvent, { type: T }>;
type Projection<T extends EngineEvent["type"]> = (
  state: EngineState,
  event: EventOf<T>,
) => EngineState;

const PROJECTIONS: { readonly [T in EngineEvent["type"]]: Projection<T> } = {
  "session.connecting": (state, { engineId }) => ({
    ...createEngineState(),
    rev: state.rev,
    connection: { status: "connecting", engineId },
  }),
  "session.connected": (state, { capabilities }) => ({
    ...state,
    connection: { status: "connected", engineId: engineIdOf(state), capabilities },
  }),
  "session.failed": (state, { reason }) => ({
    ...state,
    connection: { status: "failed", engineId: engineIdOf(state), reason },
  }),
  "catalog.loaded": (state, { nodes }) => ({ ...state, catalog: nodes }),
  "flow.submitted": (state, { rev }) => ({
    ...state,
    rev,
    schemas: {},
    acceptedRev: undefined,
    run:
      rev > state.rev && state.run?.status === "running"
        ? { ...state.run, status: "cancelled" }
        : state.run,
    nodes: rev > state.rev ? withoutKeys(state.nodes, inProgress(state.nodes)) : state.nodes,
  }),
  "flow.accepted": (state, { rev, stale, errors }) => ({
    ...state,
    acceptedRev: rev,
    nodes: { ...state.nodes, ...Object.fromEntries(stale.map((id) => [id, { state: "stale" }])) },
    results: withoutKeys(state.results, stale),
    displays: withoutKeys(state.displays, stale),
    issues: errors,
  }),
  "run.rejected": (state) => ({ ...state, run: undefined }),
  "run.requested": (state) => ({ ...state, run: { status: "running" } }),
  "run.started": (state, { runId }) =>
    state.run?.status === "running" ? { ...state, run: { status: "running", runId } } : state,
  "schema.inferred": (state, { nodeId, port, columns }) => ({
    ...state,
    schemas: { ...state.schemas, [nodeId]: { ...state.schemas[nodeId], [port]: columns } },
  }),
  "node.status": (
    state,
    { payload: { runId, nodeId, state: nodeState, progress, error, executor } },
  ) => {
    const resultRun = resultRunOf(state.nodes[nodeId], nodeState, runId);
    return {
      ...state,
      nodes: {
        ...state.nodes,
        [nodeId]: {
          state: nodeState,
          ...(progress === undefined ? {} : { progress }),
          ...(error === undefined ? {} : { error }),
          ...(executor === undefined ? {} : { executor }),
          ...(resultRun === undefined ? {} : { resultRun }),
        },
      },
    };
  },
  "node.result": (state, { payload: { nodeId, port, ref } }) => ({
    ...state,
    results: { ...state.results, [nodeId]: { ...state.results[nodeId], [port]: ref } },
  }),
  "node.display": (state, { payload: { nodeId, displays } }) => ({
    ...state,
    displays: { ...state.displays, [nodeId]: displays },
  }),
  "run.finished": (state, { payload: { runId, status, durationMs, executed, cached } }) => ({
    ...state,
    run: { status, runId, durationMs },
    nodes: {
      ...state.nodes,
      ...Object.fromEntries(executed.map((id) => [id, finishNode(state.nodes[id], "done", runId)])),
      ...Object.fromEntries(cached.map((id) => [id, finishNode(state.nodes[id], "cached", runId)])),
    },
  }),
};

export function applyEvent(state: EngineState, event: EngineEvent): EngineState {
  if (isOutdated(state, event) || isForeignRun(state, event)) return state;
  // The mapped projection table guarantees the projection matches the event's type.
  const project = PROJECTIONS[event.type] as Projection<EngineEvent["type"]>;
  return project(adoptRunId(state, event), event);
}

// Events of a run may arrive before the flow.run response that names it.
function adoptRunId(state: EngineState, event: EngineEvent): EngineState {
  const isAwaitingRunId = state.run?.status === "running" && state.run.runId === undefined;
  return isAwaitingRunId && "payload" in event && "runId" in event.payload
    ? { ...state, run: { ...state.run, runId: event.payload.runId } }
    : state;
}

function isForeignRun(state: EngineState, event: EngineEvent): boolean {
  if (
    event.type !== "node.status" &&
    event.type !== "node.result" &&
    event.type !== "node.display" &&
    event.type !== "run.finished"
  )
    return false;
  return (
    state.run === undefined ||
    state.run.status === "cancelled" ||
    (state.run.runId !== undefined && event.payload.runId !== state.run.runId)
  );
}

function isOutdated(state: EngineState, event: EngineEvent): boolean {
  const rev = revisionOf(event);
  return rev !== undefined && rev < state.rev;
}

function revisionOf(event: EngineEvent): number | undefined {
  if ("payload" in event) return event.payload.rev;
  return "rev" in event ? event.rev : undefined;
}

const IN_PROGRESS: ReadonlyArray<NodeState> = ["queued", "running"];

// Nodes of a superseded run will never hear from it again.
const inProgress = (nodes: EngineState["nodes"]) =>
  Object.keys(nodes).filter((id) => IN_PROGRESS.includes(nodes[id]?.state ?? "stale"));

// A cached node shows the result it already had, so its view stays as it is.
function resultRunOf(
  previous: NodeRun | undefined,
  nodeState: NodeState,
  runId: string,
): string | undefined {
  if (nodeState === "done") return runId;
  return nodeState === "cached" ? (previous?.resultRun ?? runId) : undefined;
}

const finishNode = (
  previous: NodeRun | undefined,
  nodeState: "done" | "cached",
  runId: string,
): NodeRun => ({
  ...previous,
  state: nodeState,
  resultRun: resultRunOf(previous, nodeState, runId) ?? runId,
});

const engineIdOf = (state: EngineState) =>
  state.connection.status === "idle" ? "" : state.connection.engineId;

function withoutKeys<T>(
  record: Readonly<Record<string, T>>,
  keys: ReadonlyArray<string>,
): Readonly<Record<string, T>> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

export function selectViewVersion(state: EngineState, nodeId: string): string | undefined {
  const node = state.nodes[nodeId];
  return node?.state === "done" || node?.state === "cached" ? node.resultRun : undefined;
}
