import { createHash } from "node:crypto";
import { canonicalJson } from "@nodomics/coordinator";
import type { Flow } from "@nodomics/protocol";

const REVISION_LENGTH = 12;
export const emptyFlow = (name?: string): Flow => ({
  format: "nodomics/flow@0",
  nodes: [],
  edges: [],
  ...(name === undefined ? {} : { name }),
});
export const revisionOf = (flow: Flow): string =>
  createHash("sha256").update(canonicalJson(flow)).digest("hex").slice(0, REVISION_LENGTH);
export { canonicalJson };
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
