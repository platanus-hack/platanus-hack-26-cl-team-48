import { createHash } from "node:crypto";

const PREFIX = "nd";
const USER_PART_LENGTH = 8;
const NODE_PART_LENGTH = 12;
const FLOW_PART_LENGTH = 6;

/**
 * Nodomics names every service itself (ADR 0027 §4): `nd-<short user id>-<node id>-<flow hash>`.
 * The flow hash keeps the same node id in two flows of one user from colliding in Render.
 */
export function serviceNameOf(owner: {
  readonly userId: string;
  readonly flowId: string;
  readonly nodeId: string;
}): string {
  return [
    PREFIX,
    owner.userId.replaceAll("-", "").toLowerCase().slice(0, USER_PART_LENGTH),
    sanitizedNodeIdOf(owner.nodeId),
    flowHashOf(owner.flowId),
  ].join("-");
}

const sanitizedNodeIdOf = (nodeId: string): string =>
  nodeId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, NODE_PART_LENGTH);

const flowHashOf = (flowId: string): string =>
  createHash("sha256").update(flowId).digest("hex").slice(0, FLOW_PART_LENGTH);
