import {
  err,
  ok,
  type ExecutorCapabilities,
  type NodeError,
  type Result,
} from "@nodomics/protocol";
import { compileTask, runtimeOf, type CompiledTask } from "./compile-task.ts";
import { findNode, type FlatGraph, type FlatNode } from "./flat-graph.ts";
import { findNodeIssues, issueToError } from "./node-issues.ts";
import { selectExecutor } from "./select-executor.ts";

/** A compiled task and the index of the executor that runs it. */
export type ResolvedTask = { readonly executor: number; readonly task: CompiledTask };

export type PlannedStep = {
  readonly nodeId: string;
  readonly outcome: Result<ResolvedTask, NodeError>;
};

/** One step per stale node, in the order given (which must be topological). */
export const planExecution = (
  graph: FlatGraph,
  stale: ReadonlyArray<string>,
  executors: ReadonlyArray<ExecutorCapabilities>,
): PlannedStep[] =>
  stale.map((nodeId) => ({
    nodeId,
    outcome: resolveTask(requireNode(graph, nodeId), graph, executors),
  }));

function resolveTask(
  node: FlatNode,
  graph: FlatGraph,
  executors: ReadonlyArray<ExecutorCapabilities>,
): Result<ResolvedTask, NodeError> {
  const issue = findNodeIssues(graph, node)[0];
  if (issue !== undefined) return err(issueToError(issue));
  const executor = selectExecutor(
    { runtime: runtimeOf(node), packages: node.manifest.requires?.packages ?? [] },
    executors,
  );
  if (!executor.ok) return executor;
  const task = compileTask(node, graph);
  return task.ok ? ok({ executor: executor.value, task: task.value }) : task;
}

function requireNode(graph: FlatGraph, nodeId: string): FlatNode {
  const node = findNode(graph, nodeId);
  if (node === undefined) throw new Error(`Stale node ${nodeId} is not in the graph`);
  return node;
}
