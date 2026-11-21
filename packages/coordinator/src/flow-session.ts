import type { NepParams, NepResult } from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { analyzeFlow } from "./analyze-flow.ts";
import type { EngineState, RunContext } from "./engine-state.ts";
import { runFlow } from "./run-flow.ts";
import { requireSession } from "./session.ts";

/** `flow.set`: keeps the flow as the current one and answers what is stale and misconfigured. */
export function setFlow(
  state: EngineState,
  { rev, flow }: NepParams<"flow.set">,
): NepResult<"flow.set"> {
  const analysis = analyzeFlow(flow, state.catalog);
  state.session.current = { rev, analysis };
  const nodeIds =
    analysis.graph.nodes.length > 0
      ? analysis.graph.nodes.map((node) => node.id)
      : flow.nodes.map((node) => node.id);
  return {
    rev,
    stale: nodeIds.filter((nodeId) => !state.store.has(analysis.keys.get(nodeId) ?? "")),
    errors: analysis.issues,
  };
}

/** `flow.run`: answers with the run id at once; progress arrives as events. */
export function startRun(
  state: EngineState,
  { rev, targets }: NepParams<"flow.run">,
): NepResult<"flow.run"> {
  const session = requireSession(state);
  if (session.rev !== rev)
    throw new RpcError(
      JsonRpcErrorCode.INVALID_PARAMS,
      `Revision ${String(rev)} is not the current flow (${String(session.rev)})`,
    );
  const run: RunContext = {
    runId: state.createId("run"),
    rev,
    analysis: session.analysis,
    control: { cancelled: false },
  };
  state.runs.set(run.runId, run);
  void runFlow(state, run, targets)
    .catch((error: unknown) => {
      reportCrashedRun(state, run, error);
    })
    .finally(() => state.runs.delete(run.runId));
  return { runId: run.runId };
}

/** `run.cancel`: nodes that have not started yet end as `cancelled`. */
export function cancelRun(state: EngineState, { runId }: NepParams<"run.cancel">): void {
  const run = state.runs.get(runId);
  if (run !== undefined) run.control.cancelled = true;
}

function reportCrashedRun(state: EngineState, run: RunContext, error: unknown): void {
  state.emit("run.log", {
    runId: run.runId,
    level: "error",
    message: error instanceof Error ? error.message : String(error),
  });
  state.emit("run.finished", {
    rev: run.rev,
    runId: run.runId,
    status: "error",
    durationMs: 0,
    executed: [],
    cached: [],
  });
}
