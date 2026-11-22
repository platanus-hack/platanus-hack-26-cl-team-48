import { ok, type Flow, type Result } from "@nodomics/protocol";
import type { StoreError } from "./deployment-store.ts";
import type { UserIdentity } from "./types.ts";

/** Reads a saved flow of the user; a flow of another user reads as missing. */
export interface FlowReader {
  read(identity: UserIdentity, flowId: string): Promise<Result<Flow | undefined, StoreError>>;
}

export function createMemoryFlowReader(
  flows: Readonly<Record<string, Readonly<Record<string, Flow>>>>,
): FlowReader {
  return { read: (identity, flowId) => Promise.resolve(ok(flows[identity.userId]?.[flowId])) };
}
