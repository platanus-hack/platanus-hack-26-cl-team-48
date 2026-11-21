import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { findConfigIssues } from "./flow-issues.ts";
import type { HandlerDeps, NepHandlers } from "./nep-handlers.ts";
import { planRunSteps } from "./plan-run-steps.ts";
import { startRun } from "./run-execution.ts";

export const createFlowHandlers = ({
  session,
  emit,
  schedule,
}: HandlerDeps): Pick<NepHandlers, "flow.set" | "flow.run" | "run.cancel"> => ({
  "flow.set": ({ rev, flow }) => {
    session.setFlow({ rev, flow });
    return {
      rev,
      stale: flow.nodes.map((node) => node.id),
      errors: findConfigIssues(flow, session.catalog),
    };
  },
  "flow.run": (params) => {
    const { rev, flow } = session.currentFlow();
    if (params.rev !== rev)
      throw new RpcError(
        JsonRpcErrorCode.INVALID_PARAMS,
        "Flow revision does not match the latest flow.set revision",
      );
    const runId = session.nextRunId();
    session.runs.set(
      runId,
      startRun(
        { rev, runId, steps: planRunSteps(flow, session.catalog, params.targets) },
        {
          emit,
          schedule,
          storeResult: (refId, table) => session.results.set(refId, table),
          onFinished: () => session.runs.delete(runId),
        },
      ),
    );
    return { runId };
  },
  "run.cancel": ({ runId }) => {
    session.runs.get(runId)?.cancel();
    return {};
  },
});
