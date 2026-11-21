import { err, ok } from "@nodomics/protocol";
import type { FlowStore, StoredFlow } from "./flow-store.ts";
import type { HubProfile } from "./hub.ts";

type MemoryFlowStoreOptions = {
  readonly current: () => HubProfile | undefined;
  readonly now: () => string;
};

const SIGNED_OUT = { kind: "signed-out" } as const;
const NOT_YOURS = { kind: "invalid" } as const;

/** The memory hub's saved flows, with the same rules as the table's row level security. */
export function createMemoryFlowStore({ current, now }: MemoryFlowStoreOptions): FlowStore {
  const flows = new Map<string, StoredFlow>();
  const isTakenByOther = (id: string, ownerId: string) => {
    const stored = flows.get(id);
    return stored !== undefined && stored.ownerId !== ownerId;
  };
  return {
    listOwnFlows: () => {
      const owner = current();
      if (owner === undefined) return Promise.resolve(err(SIGNED_OUT));
      const own = [...flows.values()].filter(({ ownerId }) => ownerId === owner.id);
      return Promise.resolve(ok(own.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))));
    },
    readFlow: (id) => {
      const stored = flows.get(id);
      const isVisible = stored?.visibility === "public" || stored?.ownerId === current()?.id;
      return Promise.resolve(ok(isVisible ? stored : undefined));
    },
    saveOwnFlow: ({ id, visibility, document }) => {
      const owner = current();
      if (owner === undefined) return Promise.resolve(err(SIGNED_OUT));
      if (isTakenByOther(id, owner.id)) return Promise.resolve(err(NOT_YOURS));
      flows.set(id, {
        id,
        ownerId: owner.id,
        visibility: visibility ?? flows.get(id)?.visibility ?? "private",
        document: structuredClone(document),
        updatedAt: now(),
      });
      return Promise.resolve(ok(undefined));
    },
    deleteOwnFlow: (id) => {
      const owner = current();
      if (owner === undefined) return Promise.resolve(err(SIGNED_OUT));
      if (isTakenByOther(id, owner.id)) return Promise.resolve(err(NOT_YOURS));
      flows.delete(id);
      return Promise.resolve(ok(undefined));
    },
  };
}
