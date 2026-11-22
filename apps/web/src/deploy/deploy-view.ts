import type { Deployment, DeployPlan, DeployResult } from "./deploy-service.ts";

/** What the Despliegue tab shows of the flow's deployments for one service node. */
export type DeploymentsView = {
  readonly own: Deployment | undefined;
  readonly orphans: readonly Deployment[];
};

export function viewDeployments(
  deployments: readonly Deployment[],
  { nodeId, flowNodeIds }: { readonly nodeId: string; readonly flowNodeIds: readonly string[] },
): DeploymentsView {
  return {
    own: deployments.find((deployment) => deployment.nodeId === nodeId),
    orphans: deployments.filter((deployment) => !flowNodeIds.includes(deployment.nodeId)),
  };
}

/** The deployments with `deployment` in place of the one of its node, if any. */
export const withDeployment = (
  deployments: readonly Deployment[],
  deployment: Deployment,
): readonly Deployment[] => [
  ...deployments.filter((each) => each.nodeId !== deployment.nodeId),
  deployment,
];

export const withoutDeployment = (
  deployments: readonly Deployment[],
  deploymentId: string,
): readonly Deployment[] => deployments.filter((each) => each.id !== deploymentId);

export const hasChangesToDeploy = (plan: DeployResult<DeployPlan> | undefined): boolean =>
  plan?.ok === true && plan.value.action !== "unchanged";

export const isNotConfigured = (
  ...results: ReadonlyArray<DeployResult<unknown> | undefined>
): boolean =>
  results.some((result) => result?.ok === false && result.error.code === "NOT_CONFIGURED");

export const canRedeploy = (
  plan: DeployResult<DeployPlan> | undefined,
  deployment: Deployment | undefined,
): boolean => deployment !== undefined && plan?.ok === true && plan.value.action === "unchanged";
