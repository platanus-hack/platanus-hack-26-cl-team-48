import { err, ok } from "@nodomics/protocol";
import type { Draft, FlowDocument, Stores, StoresFor } from "./stores.ts";

export function createMemoryStores(
  options: {
    readonly flows?: readonly { readonly userId: string; readonly document: FlowDocument }[];
  } = {},
): StoresFor {
  const users = new Map<string, Stores>();
  const documents = new Map<string, Map<string, FlowDocument>>();
  for (const { userId, document } of options.flows ?? []) {
    if (!documents.has(userId)) documents.set(userId, new Map());
    documents.get(userId)?.set(document.id, structuredClone(document));
  }
  return (identity) => {
    const existing = users.get(identity.userId);
    if (existing !== undefined) return existing;
    const stores = memoryStores(documents.get(identity.userId) ?? new Map<string, FlowDocument>());
    users.set(identity.userId, stores);
    return stores;
  };
}
function memoryStores(flows: Map<string, FlowDocument>): Stores {
  const drafts = new Map<string, Draft>();
  return {
    flows: {
      read: (flowId) => Promise.resolve(ok(structuredClone(flows.get(flowId)))),
      search: (query) =>
        Promise.resolve(
          ok(
            [...flows.values()]
              .filter((document) =>
                `${document.id} ${document.name}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map(({ id, name }) => ({ id, name })),
          ),
        ),
      write: (document) => {
        flows.set(document.id, structuredClone(document));
        return Promise.resolve(ok(undefined));
      },
    },
    drafts: {
      read: (draftId) => Promise.resolve(ok(structuredClone(drafts.get(draftId)))),
      create: (draft) => {
        if (drafts.has(draft.id))
          return Promise.resolve(err({ message: `Draft already exists: ${draft.id}` }));
        drafts.set(draft.id, structuredClone(draft));
        return Promise.resolve(ok(undefined));
      },
      update: (draft) => {
        if (!drafts.has(draft.id))
          return Promise.resolve(err({ message: `Unknown draft: ${draft.id}` }));
        drafts.set(draft.id, structuredClone(draft));
        return Promise.resolve(ok(undefined));
      },
      remove: (draftId) => {
        drafts.delete(draftId);
        return Promise.resolve(ok(undefined));
      },
    },
  };
}
