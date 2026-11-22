import type { Result } from "@nodomics/protocol";
import type { Proposal } from "../contracts/proposal.ts";
import type { DomainCard } from "../contracts/domain-card.ts";
import type { ImportReport } from "../import/import-report.ts";

export type StoredProposal = {
  readonly proposal: Proposal;
  readonly cards: readonly DomainCard[];
  readonly ownerId: string;
  readonly importReport?: ImportReport | null | undefined;
};

export type ProposalStoreErrorCode = "NOT_FOUND" | "VERSION_CONFLICT" | "STORE_FAILED";

export type ProposalStoreError = {
  readonly code: ProposalStoreErrorCode;
  readonly message: string;
};

export type ProposalStorePort = {
  readonly save: (stored: StoredProposal) => Promise<Result<void, ProposalStoreError>>;
  readonly get: (
    id: string,
    ownerId: string,
  ) => Promise<Result<StoredProposal, ProposalStoreError>>;
  readonly updateStatus: (input: {
    readonly id: string;
    readonly ownerId: string;
    readonly expectedVersion: number;
    readonly status: Proposal["status"];
  }) => Promise<Result<void, ProposalStoreError>>;
};
