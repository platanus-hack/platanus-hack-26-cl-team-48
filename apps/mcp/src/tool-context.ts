import { err, ok, type Flow, type NodeManifest, type Result } from "@nodomics/protocol";
import type { UserIdentity } from "./identity.ts";
import type { Runner } from "./runner.ts";
import type { Draft, StoreError, StoresFor } from "./stores.ts";
export type ToolDeps = {
  readonly storesFor: StoresFor;
  readonly catalog: readonly NodeManifest[];
  readonly runner: Runner;
  readonly createId: () => string;
  readonly now: () => number;
};
export type FlowRef = { readonly draftId?: string; readonly flowId?: string };
export async function readFlow(
  deps: ToolDeps,
  ref: FlowRef,
  identity: UserIdentity,
): Promise<Result<Flow, StoreError>> {
  const stores = deps.storesFor(identity);
  if (ref.draftId !== undefined) {
    const draft = await stores.drafts.read(ref.draftId);
    return draft.ok
      ? draft.value === undefined
        ? err({ message: `Unknown draft: ${ref.draftId}` })
        : ok(draft.value.flow)
      : draft;
  }
  if (ref.flowId === undefined) return err({ message: "Provide draftId or flowId" });
  const document = await stores.flows.read(ref.flowId);
  return document.ok
    ? document.value === undefined
      ? err({ message: `Unknown flow: ${ref.flowId}` })
      : ok(document.value.flow)
    : document;
}
export async function readDraft(
  deps: ToolDeps,
  draftId: string,
  identity: UserIdentity,
): Promise<Result<Draft, StoreError>> {
  const draft = await deps.storesFor(identity).drafts.read(draftId);
  return draft.ok
    ? draft.value === undefined
      ? err({ message: `Unknown draft: ${draftId}` })
      : ok(draft.value)
    : draft;
}
