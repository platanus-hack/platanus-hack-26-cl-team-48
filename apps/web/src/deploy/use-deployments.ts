import { ok } from "@nodomics/protocol";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
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
  // Show the newest completed refresh; actions invalidate all earlier replies.
  const listGeneration = useRef(0);
  const lastAppliedListGeneration = useRef(0);
  const planGeneration = useRef(0);

  const refreshStatus = useCallback(() => {
    const generation = ++listGeneration.current;
    void service.list(flowId).then(
      whileMounted(isMounted, (listed) => {
        if (generation <= lastAppliedListGeneration.current) return;
        lastAppliedListGeneration.current = generation;
        setDeployments(listed);
      }),
    );
  }, [service, flowId, isMounted]);
  const requestPlan = useCallback(() => {
    const generation = ++planGeneration.current;
    setPlan(undefined);
    void service.plan({ flowId, nodeId }).then(
      whileMounted(isMounted, (planned) => {
        if (generation === planGeneration.current) setPlan(planned);
      }),
    );
  }, [service, flowId, nodeId, isMounted]);

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
    invalidateLists();
    const result = await action;
    if (!isMounted.current) return;
    invalidateLists();
    setBusy(false);
    if (result.ok) onDone(result.value);
    else failWith(result.error.code);
  };

  const invalidateLists = () => {
    lastAppliedListGeneration.current = ++listGeneration.current;
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

/** Drops replies that arrive after the tab closed. */
const whileMounted =
  <T>(isMounted: RefObject<boolean>, apply: (value: T) => void) =>
  (value: T) => {
    if (isMounted.current) apply(value);
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
