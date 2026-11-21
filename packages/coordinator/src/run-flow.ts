import type { ExecutorCapabilities, NodeError, NodeState } from "@nodomics/protocol";
import type { CacheKeys } from "./cache-keys.ts";
import { withCompositeEvents } from "./composite-events.ts";
import { diffAgainstCache } from "./diff-against-cache.ts";
import { executorAt, type EngineState, type RunContext } from "./engine-state.ts";
import { executeTask } from "./execute-task.ts";
import { findNode, incomingEdges } from "./flat-graph.ts";
import { checkOutputContract } from "./output-contract.ts";
import { planExecution, type PlannedStep } from "./plan-execution.ts";
import type { Evictions, NodeRun } from "./result-store.ts";
import { selectTargets } from "./select-targets.ts";
import { resolveForInputs } from "./step-inputs.ts";

type StepEnd = Extract<NodeState, "done" | "error" | "stale" | "cancelled">;

type StatusUpdate = {
  readonly nodeId: string;
  readonly state: NodeState;
  readonly error?: NodeError;
  readonly executor?: string;
};

type StepContext = {
  readonly state: EngineState;
  readonly run: RunContext;
  readonly capabilities: ReadonlyArray<ExecutorCapabilities>;
  readonly unavailable: Set<string>;
};

/** Runs the stale part of the flow (only what `targets` need, if given) and reports it as events. */
export async function runFlow(
  engine: EngineState,
  run: RunContext,
  targets: ReadonlyArray<string> | undefined,
): Promise<void> {
  const startedAt = engine.now();
  const keys = selectTargets(run.analysis, targets);
  const state = withCompositeEvents(engine, run, keys);
  const { stale, cached } = diffAgainstCache(keys, state.store);
  const unplannable = reportUnplannable(state, run);
  reportCached(state, run, { nodeIds: cached, keys });
  stale.forEach((nodeId) => {
    emitStatus(state, run, { nodeId, state: "queued" });
  });
  const capabilities = await state.capabilities();
  const ends = await executeSteps(
    { state, run, capabilities, unavailable: new Set() },
    planExecution(run.analysis.graph, stale, capabilities),
  );
  await releaseEvicted(state, run);
  state.emit("run.finished", {
    rev: run.rev,
    runId: run.runId,
    status: finalStatus(run, unplannable > 0 || ends.some(([, end]) => end === "error")),
    durationMs: state.now() - startedAt,
    executed: ends.filter(([, end]) => end === "done").map(([nodeId]) => nodeId),
    cached,
  });
}

async function executeSteps(
  context: StepContext,
  steps: ReadonlyArray<PlannedStep>,
): Promise<Array<readonly [string, StepEnd]>> {
  const ends: Array<readonly [string, StepEnd]> = [];
  for (const step of steps) {
    const end = await executeStep(context, step);
    if (end !== "done") context.unavailable.add(step.nodeId);
    ends.push([step.nodeId, end]);
  }
  return ends;
}

async function executeStep(context: StepContext, step: PlannedStep): Promise<StepEnd> {
  const { state, run } = context;
  const nodeId = step.nodeId;
  if (run.control.cancelled) return finishStep(context, { nodeId, state: "cancelled" });
  if (readsFromUnavailable(context, nodeId)) return finishStep(context, { nodeId, state: "stale" });
  const resolved = step.outcome.ok
    ? resolveForInputs(state, run.analysis, { nodeId, resolved: step.outcome.value })
    : step.outcome;
  if (!resolved.ok) return finishStep(context, { nodeId, state: "error", error: resolved.error });
  const executor = context.capabilities[resolved.value.executor]?.executor ?? "";
  emitStatus(state, run, { nodeId, state: "running", executor });
  const produced = await executeTask(state, { run, nodeId, resolved: resolved.value });
  if (!produced.ok)
    return finishStep(context, { nodeId, state: "error", error: produced.error, executor });
  const broken = brokenContract(run, nodeId, produced.value);
  if (broken !== undefined) {
    await dropResults(state, new Map([[resolved.value.executor, idsHeldBy(produced.value)]]));
    return finishStep(context, { nodeId, state: "error", error: broken, executor });
  }
  const retained = await retainRun(state, resolved.value.executor, {
    key: run.analysis.keys.get(nodeId) ?? "",
    produced: produced.value,
  });
  reportResults(state, run, { nodeId, ...retained });
  return finishStep(context, { nodeId, state: "done", executor });
}

/** Caches a node run, unless an equal run got there first; then the duplicate is released. */
async function retainRun(
  state: EngineState,
  executor: number,
  result: { readonly key: string; readonly produced: NodeRun },
): Promise<NodeRun> {
  const cached = state.store.get(result.key);
  if (cached !== undefined) {
    await dropResults(state, new Map([[executor, idsHeldBy(result.produced)]]));
    return cached;
  }
  await dropResults(state, state.store.put(result.key, { executor, ...result.produced }));
  return result.produced;
}

function brokenContract(run: RunContext, nodeId: string, produced: NodeRun): NodeError | undefined {
  const node = findNode(run.analysis.graph, nodeId);
  return node === undefined ? undefined : checkOutputContract(node, produced);
}

const idsHeldBy = (produced: NodeRun): string[] =>
  [...Object.values(produced.outputs), ...produced.displays].map(({ id }) => id);

function finishStep(
  context: StepContext,
  update: StatusUpdate & { readonly state: StepEnd },
): StepEnd {
  emitStatus(context.state, context.run, update);
  return update.state;
}

const readsFromUnavailable = (context: StepContext, nodeId: string) =>
  incomingEdges(context.run.analysis.graph, nodeId).some((edge) =>
    context.unavailable.has(edge.from.node),
  );

/** Nodes that could not even be planned (unknown type, cycle) fail with their issue. */
function reportUnplannable(state: EngineState, run: RunContext): number {
  const issues = run.analysis.issues.filter((issue) => !run.analysis.keys.has(issue.nodeId));
  issues.forEach(({ nodeId, code, message }) => {
    emitStatus(state, run, { nodeId, state: "error", error: { code, message } });
  });
  return issues.length;
}

function reportCached(
  state: EngineState,
  run: RunContext,
  cached: { readonly nodeIds: ReadonlyArray<string>; readonly keys: CacheKeys },
): void {
  cached.nodeIds.forEach((nodeId) => {
    emitStatus(state, run, { nodeId, state: "cached" });
    reportResults(state, run, {
      nodeId,
      ...(state.store.get(cached.keys.get(nodeId) ?? "") ?? { outputs: {}, displays: [] }),
    });
  });
}

function reportResults(
  state: EngineState,
  run: RunContext,
  { nodeId, outputs, displays }: NodeRun & { readonly nodeId: string },
): void {
  Object.entries(outputs).forEach(([port, ref]) => {
    state.emit("node.result", { rev: run.rev, runId: run.runId, nodeId, port, ref });
  });
  if (displays.length > 0)
    state.emit("node.display", { rev: run.rev, runId: run.runId, nodeId, displays: [...displays] });
}

function emitStatus(state: EngineState, run: RunContext, update: StatusUpdate): void {
  state.emit("node.status", { rev: run.rev, runId: run.runId, ...update });
}

async function releaseEvicted(state: EngineState, run: RunContext): Promise<void> {
  const keys = new Set(state.session.current?.analysis.keys.values());
  state.runs.forEach((active) => {
    if (active.runId !== run.runId) active.analysis.keys.forEach((key) => keys.add(key));
  });
  await dropResults(state, state.store.evictExcept(keys));
}

async function dropResults(state: EngineState, evictions: Evictions): Promise<void> {
  await Promise.all(
    [...evictions].map(([executor, resultIds]) =>
      executorAt(state, executor).request("exec.drop", { resultIds: [...resultIds] }),
    ),
  );
}

const finalStatus = (run: RunContext, hasErrors: boolean) =>
  run.control.cancelled ? "cancelled" : hasErrors ? "error" : "done";
