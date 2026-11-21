import { err, ok, type Result } from "@nodomics/protocol";
import type {
  ProposalStoreError,
  ProposalStorePort,
  StoredProposal,
} from "./proposal-store-port.ts";

export function createFakeProposalStore(
  initial: readonly StoredProposal[] = [],
): ProposalStorePort {
  const store = new Map<string, StoredProposal>();

  const keyOf = (id: string, ownerId: string) => `${ownerId}:${id}`;

  for (const item of initial) {
    store.set(keyOf(item.proposal.id, item.ownerId), item);
  }

  const save = (stored: StoredProposal): Promise<Result<void, ProposalStoreError>> => {
    store.set(keyOf(stored.proposal.id, stored.ownerId), stored);
    return Promise.resolve(ok(undefined));
  };

  const get = (
    id: string,
    ownerId: string,
  ): Promise<Result<StoredProposal, ProposalStoreError>> => {
    const found = store.get(keyOf(id, ownerId));
    if (!found) {
      return Promise.resolve(err({ code: "NOT_FOUND", message: `Proposal "${id}" not found` }));
    }
    return Promise.resolve(ok(found));
  };

  const updateStatus = (input: {
    readonly id: string;
    readonly ownerId: string;
    readonly expectedVersion: number;
    readonly status: StoredProposal["proposal"]["status"];
  }): Promise<Result<void, ProposalStoreError>> => {
    const found = store.get(keyOf(input.id, input.ownerId));
    if (!found) {
      return Promise.resolve(
        err({ code: "NOT_FOUND", message: `Proposal "${input.id}" not found` }),
      );
    }
    if (found.proposal.version !== input.expectedVersion) {
      return Promise.resolve(
        err({
          code: "VERSION_CONFLICT",
          message: `Expected version ${String(input.expectedVersion)} but found ${String(found.proposal.version)}`,
        }),
      );
    }

    const updated: StoredProposal = {
      ...found,
      proposal: {
        ...found.proposal,
        version: found.proposal.version + 1,
        status: input.status,
      },
    };
    store.set(keyOf(input.id, input.ownerId), updated);
    return Promise.resolve(ok(undefined));
  };

  return { save, get, updateStatus };
}
