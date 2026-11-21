import type { NepEventPayload, NodeError, NodeState } from "@nodomics/protocol";
import type { Emit, Schedule } from "./nep-handlers.ts";
import type { ResultStep, RunStep } from "./plan-run-steps.ts";
import type { RunControl } from "./session.ts";
import type { Table } from "./table.ts";

export type PlannedRun = {
  readonly rev: number;
  readonly runId: string;
  readonly steps: readonly RunStep[];
};

export type RunDeps = {
  readonly emit: Emit;
  readonly schedule: Schedule;
  readonly storeResult: (refId: string, table: Table) => void;
  readonly onFinished: () => void;
};

type RunProgress = {
  nextStep: number;
  isOver: boolean;
  hasError: boolean;
  readonly executed: string[];
  readonly settled: Set<string>;
};

type ActiveRun = {
  readonly run: PlannedRun;
  readonly deps: RunDeps;
  readonly progress: RunProgress;
};

type NodeStatus = {
  readonly nodeId: string;
  readonly state: NodeState;
  readonly error?: NodeError;
};

type FinishStatus = NepEventPayload<"run.finished">["status"];

/** Emits a planned run one step per scheduled task, so it can be cancelled between steps. */
export function startRun(run: PlannedRun, deps: RunDeps): RunControl {
  const active: ActiveRun = {
    run,
    deps,
    progress: { nextStep: 0, isOver: false, hasError: false, executed: [], settled: new Set() },
  };
  deps.schedule(() => {
    advance(active);
  });
  return {
    cancel: () => {
      cancel(active);
    },
  };
}

function advance(active: ActiveRun): void {
  const { run, deps, progress } = active;
  if (progress.isOver) return;
  const step = run.steps[progress.nextStep];
  if (step === undefined) {
    finish(active, progress.hasError ? "error" : "done");
    return;
  }
  emitStep(active, step);
  progress.nextStep += 1;
  deps.schedule(() => {
    advance(active);
  });
}

function emitStep(active: ActiveRun, step: RunStep): void {
  if (step.kind === "status") emitStatus(active, step);
  else emitResult(active, step);
}

function emitStatus(active: ActiveRun, step: NodeStatus): void {
  const { run, deps, progress } = active;
  deps.emit("node.status", {
    rev: run.rev,
    runId: run.runId,
    nodeId: step.nodeId,
    state: step.state,
    ...(step.error === undefined ? {} : { error: step.error }),
  });
  if (step.state === "done") progress.executed.push(step.nodeId);
  if (step.state === "error") progress.hasError = true;
  if (step.state === "done" || step.state === "error") progress.settled.add(step.nodeId);
}

function emitResult(active: ActiveRun, step: ResultStep): void {
  const { run, deps } = active;
  const refId = `r_${run.runId}_${step.nodeId}_${step.port}`;
  deps.storeResult(refId, step.table);
  deps.emit("node.result", {
    rev: run.rev,
    runId: run.runId,
    nodeId: step.nodeId,
    port: step.port,
    ref: { id: refId, rowCount: step.table.rows.length, schema: [...step.table.columns] },
  });
}

function cancel(active: ActiveRun): void {
  if (active.progress.isOver) return;
  pendingNodeIds(active).forEach((nodeId) => {
    emitStatus(active, { nodeId, state: "cancelled" });
  });
  finish(active, "cancelled");
}

const pendingNodeIds = ({ run, progress }: ActiveRun): string[] =>
  run.steps
    .filter((step) => step.kind === "status" && step.state === "queued")
    .map((step) => step.nodeId)
    .filter((nodeId) => !progress.settled.has(nodeId));

function finish(active: ActiveRun, status: FinishStatus): void {
  const { run, deps, progress } = active;
  progress.isOver = true;
  deps.emit("run.finished", {
    rev: run.rev,
    runId: run.runId,
    status,
    // The mock has no real work to time; a constant keeps runs deterministic.
    durationMs: 0,
    executed: [...progress.executed],
    cached: [],
  });
  deps.onFinished();
}
