import { ok, type NodeError, type Result } from "@nodomics/protocol";
import type { CacheKeys } from "./cache-keys.ts";
import { compileTask } from "./compile-task.ts";
import type { EngineState } from "./engine-state.ts";
import { findNode, incomingEdges, type FlatGraph } from "./flat-graph.ts";
import { applyInputColumns, type InputColumns } from "./input-columns.ts";
import type { ResolvedTask } from "./plan-execution.ts";

type Analysis = { readonly graph: FlatGraph; readonly keys: CacheKeys };

/** The columns of a node's inputs, read from the cached results of the nodes that feed it. */
export const storedInputColumns =
  (state: EngineState, analysis: Analysis, nodeId: string): InputColumns =>
  (port) => {
    const edge = incomingEdges(analysis.graph, nodeId).find(({ to }) => to.port === port);
    if (edge === undefined) return undefined;
    return state.store.get(analysis.keys.get(edge.from.node) ?? "")?.outputs[edge.from.port]
      ?.schema;
  };

/**
 * A planned task checked against the columns its inputs produced; it is compiled again only when a
 * param stops applying to them (ADR 0013).
 */
export function resolveForInputs(
  state: EngineState,
  analysis: Analysis,
  step: { readonly nodeId: string; readonly resolved: ResolvedTask },
): Result<ResolvedTask, NodeError> {
  const node = findNode(analysis.graph, step.nodeId);
  if (node === undefined) return ok(step.resolved);
  const applied = applyInputColumns(node, storedInputColumns(state, analysis, step.nodeId));
  if (!applied.ok || applied.value === node) return applied.ok ? ok(step.resolved) : applied;
  const task = compileTask(applied.value, analysis.graph);
  return task.ok ? ok({ ...step.resolved, task: task.value }) : task;
}
