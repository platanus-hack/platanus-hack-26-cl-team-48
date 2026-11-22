import { Type, type Static } from "@sinclair/typebox";

export const RUNTIMES = ["node", "python", "go", "ruby", "rust", "elixir"] as const;

const Text = Type.String();
const RepoSpec = Type.Object({
  url: Text,
  branch: Text,
  rootDir: Type.Optional(Text),
});
const DockerBuild = Type.Object({
  kind: Type.Literal("docker"),
  dockerfilePath: Text,
  dockerContext: Text,
});
const NativeBuild = Type.Object({
  kind: Type.Literal("native"),
  runtime: Type.Union(RUNTIMES.map((runtime) => Type.Literal(runtime))),
  buildCommand: Type.Optional(Text),
  startCommand: Text,
});
const StaticBuild = Type.Object({
  kind: Type.Literal("static"),
  buildCommand: Type.Optional(Text),
  publishPath: Text,
});
const EnvVar = Type.Object({
  name: Text,
  value: Type.Optional(Text),
  secret: Type.Optional(Text),
});

/** What apps/deploy asks the hosting provider for: only the whitelisted fields of ADR 0027 §2. */
export const ServiceSpec = Type.Object({
  repo: RepoSpec,
  build: Type.Union([DockerBuild, NativeBuild, StaticBuild]),
  env: Type.Array(EnvVar),
  healthCheckPath: Type.Optional(Text),
});
export type ServiceSpec = Static<typeof ServiceSpec>;
export type BuildSpec = ServiceSpec["build"];
export type EnvVarSpec = ServiceSpec["env"][number];
export type Runtime = (typeof RUNTIMES)[number];

export const DeploymentStatus = Type.Union([
  Type.Literal("creating"),
  Type.Literal("deploying"),
  Type.Literal("live"),
  Type.Literal("failed"),
  Type.Literal("suspended"),
]);
export type DeploymentStatus = Static<typeof DeploymentStatus>;

export type PlanAction = "create" | "update" | "unchanged";
export type PlanChange = {
  readonly field: string;
  readonly before?: unknown;
  readonly after?: unknown;
};
export type Plan = {
  readonly action: PlanAction;
  readonly hash: string;
  readonly changes: readonly PlanChange[];
  readonly spec: ServiceSpec;
};

export type Deployment = {
  readonly id: string;
  readonly flowId: string;
  readonly nodeId: string;
  readonly url?: string;
  readonly status: DeploymentStatus;
  readonly updatedAt: string;
};

export type DeployErrorCode =
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "FLOW_NOT_FOUND"
  | "NODE_NOT_FOUND"
  | "NOT_A_SERVICE"
  | "MISSING_REPO"
  | "INVALID_REPO"
  | "INVALID_SPEC"
  | "QUOTA_USER"
  | "QUOTA_TOTAL"
  | "PLAN_CHANGED"
  | "MISSING_SECRET"
  | "DEPLOYMENT_NOT_FOUND"
  | "PROVIDER_ERROR"
  | "UNAVAILABLE"
  | "SERVICE_KIND_CHANGED"
  | "RATE_LIMITED";
export type DeployError = { readonly code: DeployErrorCode; readonly message: string };

export type UserIdentity = { readonly userId: string; readonly accessToken: string };
