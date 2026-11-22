import { FLOW_FORMAT, type Flow, type FlowEdge, type FlowNode } from "@nodomics/protocol";

export const REPO_TYPE = "core.deploy.repo";
export const SERVICE_TYPE = "core.deploy.service";
export const NODE_VERSION = "0.1.0";
export const REPO_URL = "https://github.com/nodomics/demo-app";

export const repoNode = (params: Record<string, unknown> = {}, id = "repo"): FlowNode => ({
  id,
  type: REPO_TYPE,
  version: NODE_VERSION,
  params: { url: REPO_URL, ...params },
  position: { x: 0, y: 0 },
});

export const serviceNode = (params: Record<string, unknown> = {}, id = "web"): FlowNode => ({
  id,
  type: SERVICE_TYPE,
  version: NODE_VERSION,
  params: { build: "native", startCommand: "npm start", ...params },
  position: { x: 200, y: 0 },
});

export const repoEdge = (from = "repo", to = "web"): FlowEdge => ({
  id: `${from}-to-${to}`,
  from: { node: from, port: "repo" },
  to: { node: to, port: "repo" },
});

export const flowOf = (nodes: FlowNode[], edges: FlowEdge[]): Flow => ({
  format: FLOW_FORMAT,
  nodes,
  edges,
});

/** A saved flow with one Repo node connected to one Service node. */
export function deployFlow(
  options: {
    readonly repo?: Record<string, unknown>;
    readonly service?: Record<string, unknown>;
    readonly serviceId?: string;
  } = {},
): Flow {
  const serviceId = options.serviceId ?? "web";
  return flowOf(
    [repoNode(options.repo), serviceNode(options.service, serviceId)],
    [repoEdge("repo", serviceId)],
  );
}
