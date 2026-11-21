import type {
  ExecutorCapabilities,
  ExecutorParams,
  ExecutorPort,
  NepEvent,
  NepEventPayload,
  NodeManifest,
  SourceFormat,
} from "@nodomics/protocol";
import type { FlowAnalysis } from "./analyze-flow.ts";
import type { Fetch } from "./fetch-request.ts";
import type { LocatedResult, ResultStore } from "./result-store.ts";

export type Emit = <E extends NepEvent>(event: E, payload: NepEventPayload<E>) => void;

/** A source the engine offers without an upload, loaded the first time a template reads it. */
export type PresetSource = {
  readonly format: SourceFormat;
  readonly location: ExecutorParams<"exec.load">["location"];
};

export type Session = { readonly rev: number; readonly analysis: FlowAnalysis };

/** One run of the current flow. `control.cancelled` is set by `run.cancel`. */
export type RunContext = {
  readonly runId: string;
  readonly rev: number;
  readonly analysis: FlowAnalysis;
  readonly control: { cancelled: boolean };
};

export type TaskOwner = { readonly runId: string; readonly nodeId: string };

/** Everything the coordinator shell reads and updates while serving requests. */
export type EngineState = {
  readonly executors: ReadonlyArray<ExecutorPort>;
  readonly capabilities: () => Promise<ReadonlyArray<ExecutorCapabilities>>;
  readonly emit: Emit;
  readonly now: () => number;
  readonly createId: (prefix: string) => string;
  readonly catalog: Map<string, NodeManifest>;
  readonly store: ResultStore;
  readonly sources: Map<string, LocatedResult>;
  readonly presetSources: Readonly<Record<string, PresetSource>>;
  readonly fetch: Fetch | undefined;
  readonly tasks: Map<string, TaskOwner>;
  readonly runs: Map<string, RunContext>;
  readonly session: { current: Session | undefined };
};

export function executorAt(state: EngineState, index: number): ExecutorPort {
  const executor = state.executors[index];
  if (executor === undefined) throw new Error(`No executor at index ${String(index)}`);
  return executor;
}
