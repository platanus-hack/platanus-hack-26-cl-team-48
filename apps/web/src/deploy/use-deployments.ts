import { ok } from "@nodomics/protocol";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useDeploy } from "./deploy-context.ts";
import type { DeployErrorCode, Deployment, DeployPlan, DeployResult } from "./deploy-service.ts";
import { withDeployment, withoutDeployment } from "./deploy-view.ts";

/** The provider refreshes a service's status on its own; the tab follows it while open. */
const REFRESH_INTERVAL_MS = 5000;

type Secrets = Readonly<Record<string, string>>;
type Target = { readonly flowId: string; readonly nodeId: string };

export type DeploymentsState = {
  readonly deployments: DeployResult<readonly Deployment[]> | undefined;
  readonly plan: DeployResult<DeployPlan> | undefined;
  readonly isBusy: boolean;
  readonly failure: DeployErrorCode | undefined;
  readonly refresh: () => void;
  readonly deploy: (secrets: Secrets) => void;
  readonly redeploy: (secrets: Secrets) => void;
  readonly remove: (deploymentId: string) => void;
};

/** The flow's deployments and the node's plan, kept fresh while the Despliegue tab is open. */
export function useDeployments({ flowId, nodeId }: Target): DeploymentsState {
  const service = useDeploy();
  const isMounted = useIsMounted();
  const [deployments, setDeployments] = useState<DeploymentsState["deployments"]>();
  const [plan, setPlan] = useState<DeploymentsState["plan"]>();
  const [isBusy, setBusy] = useState(false);
  const [failure, setFailure] = useState<DeployErrorCode>();
  // Every list and every action takes a new turn: only the reply to the latest one is shown.
  const listTurns = useTurns();
  const planTurns = useTurns();

  const refreshStatus = useCallback(() => {
    void service.list(flowId).then(whileLatest(isMounted, listTurns.take(), setDeployments));
  }, [service, flowId, isMounted, listTurns]);
  const requestPlan = useCallback(() => {
    setPlan(undefined);
    void service.plan({ flowId, nodeId }).then(whileLatest(isMounted, planTurns.take(), setPlan));
  }, [service, flowId, nodeId, isMounted, planTurns]);

  const refresh = useCallback(() => {
    refreshStatus();
    requestPlan();
  }, [refreshStatus, requestPlan]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refreshStatus, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [refresh, refreshStatus]);

  const runAction = async <T>(action: Promise<DeployResult<T>>, onDone: (value: T) => void) => {
    setBusy(true);
    setFailure(undefined);
    listTurns.take();
    const result = await action;
    if (!isMounted.current) return;
    listTurns.take();
    setBusy(false);
    if (result.ok) onDone(result.value);
    else failWith(result.error.code);
  };

  const failWith = (code: DeployErrorCode) => {
    setFailure(code);
    if (code === "PLAN_CHANGED") requestPlan();
  };

  const showDeployment = (deployment: Deployment) => {
    setDeployments((current) =>
      ok(withDeployment(current?.ok === true ? current.value : [], deployment)),
    );
  };

  return {
    deployments,
    plan,
    isBusy,
    failure,
    refresh,
    deploy: (secrets) => {
      if (plan?.ok !== true) return;
      void runAction(
        service.apply({ flowId, nodeId, planHash: plan.value.hash, secrets }),
        (created) => {
          showDeployment(created);
          requestPlan();
        },
      );
    },
    redeploy: (secrets) => {
      void runAction(service.redeploy({ flowId, nodeId, secrets }), showDeployment);
    },
    remove: (deploymentId) => {
      void runAction(service.remove(deploymentId), () => {
        setDeployments((current) =>
          current?.ok === true ? ok(withoutDeployment(current.value, deploymentId)) : current,
        );
      });
    },
  };
}

type Turns = { readonly take: () => Turn };
type Turn = { readonly isLatest: () => boolean };

/** Numbers requests so a slow reply cannot overwrite the reply to a later request. */
function useTurns(): Turns {
  const latest = useRef(0);
  return useMemo(
    () => ({
      take: () => {
        latest.current += 1;
        const turn = latest.current;
        return { isLatest: () => turn === latest.current };
      },
    }),
    [],
  );
}

/** Drops replies that arrive after the tab closed or after a later request was sent. */
const whileLatest =
  <T>(isMounted: RefObject<boolean>, turn: Turn, apply: (value: T) => void) =>
  (value: T) => {
    if (isMounted.current && turn.isLatest()) apply(value);
  };

function useIsMounted(): RefObject<boolean> {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}
