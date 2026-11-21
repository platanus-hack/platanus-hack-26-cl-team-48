import type { HubResult } from "./hub.ts";

export type FlowVisibility = "private" | "public";

export type StoredFlow = {
  readonly id: string;
  readonly ownerId: string;
  readonly visibility: FlowVisibility;
  /** The interface's saved flow; the hub keeps it as is and the interface parses it. */
  readonly document: unknown;
  readonly updatedAt: string;
};

export type FlowDraft = {
  readonly id: string;
  readonly visibility: FlowVisibility;
  readonly document: unknown;
};

/** Saved flows of the signed-in account, private or public (ADR 0023). */
export interface FlowStore {
  /** Most recently updated first. */
  listOwnFlows(): Promise<HubResult<ReadonlyArray<StoredFlow>>>;
  /** Mine, or anyone's public flow. */
  readFlow(id: string): Promise<HubResult<StoredFlow | undefined>>;
  /** Creates or replaces one of my flows. */
  saveOwnFlow(draft: FlowDraft): Promise<HubResult<void>>;
  deleteOwnFlow(id: string): Promise<HubResult<void>>;
}
