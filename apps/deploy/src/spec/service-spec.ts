import { ok, type Flow, type FlowNode, type Result } from "@nodomics/protocol";
import type { DeployError, ServiceSpec } from "../types.ts";
import { buildSpecOf } from "./build-spec.ts";
import { envSpecOf } from "./env-spec.ts";
import { failure, textParam } from "./node-params.ts";
import { repoSpecOf } from "./repo-spec.ts";

export const SERVICE_NODE_TYPE = "core.deploy.service";
export const REPO_NODE_TYPE = "core.deploy.repo";
const REPO_PORT = "repo";

/** The whitelisted spec of a top-level Service node and the Repo node connected to it. */
export function serviceSpecOf(flow: Flow, nodeId: string): Result<ServiceSpec, DeployError> {
  const node = flow.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined)
    return failure("NODE_NOT_FOUND", `The node "${nodeId}" is not in the flow`);
  if (node.type !== SERVICE_NODE_TYPE)
    return failure("NOT_A_SERVICE", `The node "${nodeId}" is not a Service node`);
  const repoNode = connectedRepoOf(flow, nodeId);
  if (repoNode === undefined)
    return failure("MISSING_REPO", "Connect a Repo node to the repo input of the service");
  return specFrom(repoNode, node);
}

function specFrom(repoNode: FlowNode, serviceNode: FlowNode): Result<ServiceSpec, DeployError> {
  const repo = repoSpecOf(repoNode.params);
  if (!repo.ok) return repo;
  const build = buildSpecOf(serviceNode.params);
  if (!build.ok) return build;
  const env = envSpecOf(serviceNode.params["env"]);
  if (!env.ok) return env;
  const healthCheckPath = textParam(serviceNode.params, "healthCheckPath");
  return ok({
    repo: repo.value,
    build: build.value,
    env: env.value,
    ...(healthCheckPath === undefined ? {} : { healthCheckPath }),
  });
}

function connectedRepoOf(flow: Flow, serviceId: string): FlowNode | undefined {
  const edge = flow.edges.find(
    (candidate) => candidate.to.node === serviceId && candidate.to.port === REPO_PORT,
  );
  return flow.nodes.find((node) => node.id === edge?.from.node && node.type === REPO_NODE_TYPE);
}
