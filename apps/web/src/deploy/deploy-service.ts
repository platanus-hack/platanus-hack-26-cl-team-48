import type { Result } from "@nodomics/protocol";

/** The error codes of the apps/deploy API (ADR 0027), plus the app's own when it has no URL. */
export const DEPLOY_ERROR_CODES = [
  "UNAUTHORIZED",
  "BAD_REQUEST",
  "FLOW_NOT_FOUND",
  "NODE_NOT_FOUND",
  "NOT_A_SERVICE",
  "MISSING_REPO",
  "INVALID_REPO",
  "INVALID_SPEC",
  "QUOTA_USER",
  "QUOTA_TOTAL",
  "PLAN_CHANGED",
  "MISSING_SECRET",
  "DEPLOYMENT_NOT_FOUND",
  "PROVIDER_ERROR",
  "UNAVAILABLE",
] as const;

export type DeployErrorCode = (typeof DEPLOY_ERROR_CODES)[number] | "NOT_CONFIGURED";

export type DeployResult<T> = Result<T, { readonly code: DeployErrorCode }>;

export type PlanChange = {
  readonly field: string;
  readonly before?: unknown;
  readonly after?: unknown;
};

export type DeployPlan = {
  readonly action: "create" | "update" | "unchanged";
  readonly hash: string;
  readonly changes: readonly PlanChange[];
};

export const DEPLOYMENT_STATUSES = [
  "creating",
  "deploying",
  "live",
  "failed",
  "suspended",
] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export type Deployment = {
  readonly id: string;
  readonly flowId: string;
  readonly nodeId: string;
  readonly url?: string;
  readonly status: DeploymentStatus;
  readonly updatedAt: string;
};

export type DeployRequest = { readonly flowId: string; readonly nodeId: string };

export type ApplyRequest = DeployRequest & {
  readonly planHash: string;
  readonly secrets: Readonly<Record<string, string>>;
};

/** The hosting service of ADR 0027 (apps/deploy), as the Despliegue tab uses it. */
export interface DeployService {
  plan(request: DeployRequest): Promise<DeployResult<DeployPlan>>;
  apply(request: ApplyRequest): Promise<DeployResult<Deployment>>;
  list(flowId: string): Promise<DeployResult<readonly Deployment[]>>;
  remove(deploymentId: string): Promise<DeployResult<void>>;
}
