const PREFIX = "nd";
const USER_PART_LENGTH = 8;
const NODE_PART_LENGTH = 20;

/** Nodomics names every service itself (ADR 0027 §4): `nd-<short user id>-<node id>`. */
export function serviceNameOf(userId: string, nodeId: string): string {
  const userPart = userId.replaceAll("-", "").toLowerCase().slice(0, USER_PART_LENGTH);
  const nodePart = nodeId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, NODE_PART_LENGTH);
  return `${PREFIX}-${userPart}-${nodePart}`;
}
