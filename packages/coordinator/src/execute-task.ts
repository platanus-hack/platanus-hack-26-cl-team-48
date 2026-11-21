import {
  err,
  ok,
  type NodeError,
  type ResultRef,
  type Result,
  type Task,
} from "@nodomics/protocol";
import { executorAt, type EngineState, type RunContext } from "./engine-state.ts";
import { findNode } from "./flat-graph.ts";
import type { ResolvedTask } from "./plan-execution.ts";
import type { NodeRun } from "./result-store.ts";
import { quoteIdentifier } from "./sql-quoting.ts";
import { resolveTaskInputs } from "./task-inputs.ts";

type NodeOutputs = NodeRun["outputs"];

export type TaskStep = {
  readonly run: RunContext;
  readonly nodeId: string;
  readonly resolved: ResolvedTask;
};

/** Runs one planned task on its executor and returns its outputs by port and its figures. */
export async function executeTask(
  state: EngineState,
  step: TaskStep,
): Promise<Result<NodeRun, NodeError>> {
  const { task, executor } = step.resolved;
  if (task.kind === "view") return ok({ outputs: {}, displays: [] });
  // Executors and transports report failures by rejecting; here they become the node's error.
  try {
    const inputs = await resolveTaskInputs(state, step.run.analysis.keys, {
      inputs: task.inputs,
      executor,
    });
    if (!inputs.ok) return inputs;
    return task.kind === "relay"
      ? await relayInputs(state, step, inputs.value)
      : await runOnExecutor(state, step, { ...task, inputs: inputs.value });
  } catch (error) {
    return err(executorFailure(error));
  }
}

async function runOnExecutor(
  state: EngineState,
  step: TaskStep,
  task: Task,
): Promise<Result<NodeRun, NodeError>> {
  const taskId = state.createId("task");
  state.tasks.set(taskId, { runId: step.run.runId, nodeId: step.nodeId });
  try {
    const response = await executorAt(state, step.resolved.executor).request("exec.run", {
      taskId,
      task,
    });
    return response.ok
      ? ok({ outputs: nameOutputs(step, response.outputs), displays: response.displays ?? [] })
      : err(response.error);
  } finally {
    state.tasks.delete(taskId);
  }
}

/** Copies each input into a result the node owns, so dropping it never drops the input. */
async function relayInputs(
  state: EngineState,
  step: TaskStep,
  inputs: Readonly<Record<string, string>>,
): Promise<Result<NodeRun, NodeError>> {
  const outputs: Record<string, ResultRef> = {};
  for (const [port, resultId] of Object.entries(inputs)) {
    const copied = await runOnExecutor(state, step, copyTask(port, resultId));
    const [ref] = copied.ok ? Object.values(copied.value.outputs) : [];
    if (ref === undefined) {
      await dropResults(state, step, Object.values(outputs));
      return copied.ok ? err(executorFailure("The copy produced no result")) : copied;
    }
    outputs[port] = ref;
  }
  return ok({ outputs, displays: [] });
}

const copyTask = (port: string, resultId: string): Task => ({
  kind: "sql",
  query: `SELECT * FROM ${quoteIdentifier(port)}`,
  inputs: { [port]: resultId },
});

async function dropResults(state: EngineState, step: TaskStep, refs: ReadonlyArray<ResultRef>) {
  await executorAt(state, step.resolved.executor).request("exec.drop", {
    resultIds: refs.map(({ id }) => id),
  });
}

/** A SQL executor names its single result freely; it belongs to the node's single output port. */
function nameOutputs(step: TaskStep, outputs: NodeOutputs): NodeOutputs {
  const ports = findNode(step.run.analysis.graph, step.nodeId)?.manifest.outputs ?? [];
  const refs = Object.values(outputs);
  const [port] = ports;
  const [ref] = refs;
  return ports.length === 1 && refs.length === 1 && port !== undefined && ref !== undefined
    ? { [port.id]: ref }
    : outputs;
}

const executorFailure = (error: unknown): NodeError => ({
  code: "RUNTIME_UNAVAILABLE",
  message: "El motor no pudo ejecutar el nodo",
  detail: error instanceof Error ? error.message : String(error),
});
