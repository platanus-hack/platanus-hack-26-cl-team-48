import { ok, type Flow, type Result } from "@nodomics/protocol";
import type { DeploymentRecord, DeploymentStore } from "./deployment-store.ts";
import type { FlowReader } from "./flow-reader.ts";
import type { HostingProvider, Secrets } from "./hosting-provider.ts";
import { checkQuota } from "./limits.ts";
import { serviceNameOf } from "./service-name.ts";
import { planDeployment } from "./spec/plan.ts";
import { failure } from "./spec/node-params.ts";
import { serviceSpecOf } from "./spec/service-spec.ts";
import { createSerialQueue } from "./serial-queue.ts";
import type { Deployment, DeployError, Plan, ServiceSpec, UserIdentity } from "./types.ts";

type NodeTarget = { readonly flowId: string; readonly nodeId: string };
type RedeployRequest = NodeTarget & { readonly secrets: Secrets };
type ApplyRequest = RedeployRequest & { readonly planHash: string };
type Planned = { readonly plan: Plan; readonly previous: DeploymentRecord | undefined };
type Outcome<T> = Promise<Result<T, DeployError>>;

export interface DeployUseCases {
  plan(identity: UserIdentity, target: NodeTarget): Outcome<Plan>;
  apply(identity: UserIdentity, request: ApplyRequest): Outcome<Deployment>;
  redeploy(identity: UserIdentity, request: RedeployRequest): Outcome<Deployment>;
  list(identity: UserIdentity, flowId: string): Outcome<Deployment[]>;
  remove(identity: UserIdentity, deploymentId: string): Outcome<void>;
}

export type DeployDeps = {
  readonly flows: FlowReader;
  readonly deployments: DeploymentStore;
  readonly provider: HostingProvider;
  readonly now: () => Date;
  readonly createId: () => string;
};

export function createDeployUseCases(deps: DeployDeps): DeployUseCases {
  // Quota check, provider call and save must not interleave, or parallel applies overrun the
  // quotas (ADR 0029 §5). Valid while apps/deploy runs as a single instance.
  const oneAtATime = createSerialQueue();
  return {
    plan: async (identity, target) => {
      const planned = await planFor(deps, identity, target);
      return planned.ok ? ok(planned.value.plan) : planned;
    },
    apply: (identity, request) => oneAtATime(() => applyPlan(deps, identity, request)),
    redeploy: (identity, request) => oneAtATime(() => redeployService(deps, identity, request)),
    list: (identity, flowId) => listDeployments(deps, identity, flowId),
    remove: (identity, deploymentId) =>
      oneAtATime(() => removeDeployment(deps, identity, deploymentId)),
  };
}

async function planFor(
  deps: DeployDeps,
  identity: UserIdentity,
  target: NodeTarget,
): Outcome<Planned> {
  const flow = await readFlow(deps, identity, target.flowId);
  if (!flow.ok) return flow;
  const spec = serviceSpecOf(flow.value, target.nodeId);
  if (!spec.ok) return spec;
  const previous = await deps.deployments.findByNode(identity.userId, target.flowId, target.nodeId);
  if (!previous.ok) return unavailable();
  if (isKindChange(previous.value?.spec, spec.value))
    return failure(
      "SERVICE_KIND_CHANGED",
      "A deployed service cannot switch between static and docker or native; remove it first",
    );
  const plan = planDeployment(spec.value, previous.value);
  const quota = await quotaFor(deps, identity, plan);
  return quota.ok ? ok({ plan, previous: previous.value }) : quota;
}

async function applyPlan(
  deps: DeployDeps,
  identity: UserIdentity,
  request: ApplyRequest,
): Outcome<Deployment> {
  const planned = await planFor(deps, identity, request);
  if (!planned.ok) return planned;
  const { plan, previous } = planned.value;
  if (plan.hash !== request.planHash)
    return failure("PLAN_CHANGED", "The flow changed since the plan; plan the deployment again");
  const secrets = checkSecrets(plan.spec, request.secrets);
  if (!secrets.ok) return secrets;
  if (previous === undefined) return createService(deps, { identity, request, plan });
  if (plan.action === "unchanged") return ok(deploymentOf(previous));
  return updateService(deps, { previous, request, plan });
}

async function redeployService(
  deps: DeployDeps,
  identity: UserIdentity,
  request: RedeployRequest,
): Outcome<Deployment> {
  const planned = await planFor(deps, identity, request);
  if (!planned.ok) return planned;
  const { plan, previous } = planned.value;
  if (previous === undefined)
    return failure("DEPLOYMENT_NOT_FOUND", "This node has no deployed service to redeploy");
  if (plan.action !== "unchanged")
    return failure("PLAN_CHANGED", "The flow changed since the deployment; deploy the changes");
  const secrets = checkSecrets(plan.spec, request.secrets);
  if (!secrets.ok) return secrets;
  return updateService(deps, { previous, request, plan });
}

function checkSecrets(spec: ServiceSpec, secrets: Secrets): Result<void, DeployError> {
  const missing = spec.env.find(
    (variable) => variable.secret !== undefined && secrets[variable.secret] === undefined,
  );
  return missing === undefined
    ? ok(undefined)
    : failure("MISSING_SECRET", `The variable ${missing.name} needs the value of its secret`);
}

/** Render cannot turn a static site into a web service or back (ADR 0029 §2). */
const isKindChange = (deployed: ServiceSpec | undefined, wanted: ServiceSpec): boolean =>
  deployed !== undefined && isStatic(deployed) !== isStatic(wanted);

const isStatic = (spec: ServiceSpec): boolean => spec.build.kind === "static";

async function createService(
  deps: DeployDeps,
  { identity, request, plan }: { identity: UserIdentity; request: ApplyRequest; plan: Plan },
): Outcome<Deployment> {
  const created = await deps.provider.create({
    name: serviceNameOf({
      userId: identity.userId,
      flowId: request.flowId,
      nodeId: request.nodeId,
    }),
    spec: plan.spec,
    secrets: request.secrets,
  });
  if (!created.ok) return providerFailure();
  const saved = await saveRecord(deps, {
    id: deps.createId(),
    ownerId: identity.userId,
    flowId: request.flowId,
    nodeId: request.nodeId,
    providerServiceId: created.value.serviceId,
    ...(created.value.url === undefined ? {} : { url: created.value.url }),
    spec: plan.spec,
    specHash: plan.hash,
    status: "deploying",
    updatedAt: deps.now().toISOString(),
  });
  // A service without its row would stay live in Render, unseen and outside the quotas.
  if (!saved.ok) await deps.provider.remove(created.value.serviceId);
  return saved;
}

async function updateService(
  deps: DeployDeps,
  { previous, request, plan }: { previous: DeploymentRecord; request: RedeployRequest; plan: Plan },
): Outcome<Deployment> {
  const updated = await deps.provider.update(previous.providerServiceId, {
    spec: plan.spec,
    secrets: request.secrets,
  });
  if (!updated.ok) return providerFailure();
  return saveRecord(deps, {
    ...previous,
    spec: plan.spec,
    specHash: plan.hash,
    status: "deploying",
    updatedAt: deps.now().toISOString(),
  });
}

async function listDeployments(
  deps: DeployDeps,
  identity: UserIdentity,
  flowId: string,
): Outcome<Deployment[]> {
  const records = await deps.deployments.listByFlow(identity.userId, flowId);
  if (!records.ok) return unavailable();
  const refreshed = await Promise.all(records.value.map((record) => refreshStatus(deps, record)));
  return ok(refreshed.map(deploymentOf));
}

/** Best effort: when the provider or the store fails, the last known status is kept. */
async function refreshStatus(
  deps: DeployDeps,
  record: DeploymentRecord,
): Promise<DeploymentRecord> {
  const status = await deps.provider.status(record.providerServiceId);
  if (!status.ok || status.value === record.status) return record;
  const refreshed = { ...record, status: status.value, updatedAt: deps.now().toISOString() };
  await deps.deployments.save(refreshed);
  return refreshed;
}

async function removeDeployment(
  deps: DeployDeps,
  identity: UserIdentity,
  deploymentId: string,
): Outcome<void> {
  const record = await deps.deployments.get(identity.userId, deploymentId);
  if (!record.ok) return unavailable();
  if (record.value === undefined)
    return failure("DEPLOYMENT_NOT_FOUND", `There is no deployment ${deploymentId}`);
  const removed = await deps.provider.remove(record.value.providerServiceId);
  if (!removed.ok) return providerFailure();
  const forgotten = await deps.deployments.remove(deploymentId);
  return forgotten.ok ? ok(undefined) : unavailable();
}

async function readFlow(deps: DeployDeps, identity: UserIdentity, flowId: string): Outcome<Flow> {
  const flow = await deps.flows.read(identity, flowId);
  if (!flow.ok) return unavailable();
  return flow.value === undefined
    ? failure("FLOW_NOT_FOUND", "The saved flow does not exist or is not yours")
    : ok(flow.value);
}

async function quotaFor(deps: DeployDeps, identity: UserIdentity, plan: Plan): Outcome<void> {
  const userCount = await deps.deployments.countByOwner(identity.userId);
  if (!userCount.ok) return unavailable();
  const totalCount = await deps.deployments.countAll();
  if (!totalCount.ok) return unavailable();
  return checkQuota({
    action: plan.action,
    userCount: userCount.value,
    totalCount: totalCount.value,
  });
}

async function saveRecord(deps: DeployDeps, record: DeploymentRecord): Outcome<Deployment> {
  const saved = await deps.deployments.save(record);
  return saved.ok ? ok(deploymentOf(record)) : unavailable();
}

const deploymentOf = (record: DeploymentRecord): Deployment => ({
  id: record.id,
  flowId: record.flowId,
  nodeId: record.nodeId,
  ...(record.url === undefined ? {} : { url: record.url }),
  status: record.status,
  updatedAt: record.updatedAt,
});

// Store and provider messages may carry internal details, so users get a fixed message.
const unavailable = (): Result<never, DeployError> =>
  failure("UNAVAILABLE", "Deployment storage is unavailable; try again later");

const providerFailure = (): Result<never, DeployError> =>
  failure("PROVIDER_ERROR", "The hosting provider failed; try again later");
