import { err, ok, type Result } from "@nodomics/protocol";
import { randomUUID } from "node:crypto";
import type { DomainCard } from "../contracts/domain-card.ts";
import type { Proposal } from "../contracts/proposal.ts";
import type { LlmPort } from "../llm/llm-port.ts";
import type { DiffEntry } from "../mcp/fake-diff.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";
import { toDomainCards, type ManifestLookup } from "./domain-cards.ts";
import { toProposalChanges } from "./from-diff.ts";
import { writeReasons } from "./reasons.ts";

export type BuildProposalInput = {
  readonly mcp: McpPort;
  readonly llm: LlmPort;
  readonly identity: UserIdentity;
  readonly draftId: string;
  readonly flowId: string;
  readonly manifests?: ManifestLookup;
  readonly context?: unknown;
};

export type ProposalOutcome = {
  readonly proposal: Proposal;
  readonly cards: readonly DomainCard[];
};

export type BuildProposalError = {
  readonly code: "DIFF_FAILED" | "MCP_ERROR";
  readonly message: string;
};

type RawDiff = {
  readonly baseRevision?: string;
  readonly entries?: readonly DiffEntry[];
  readonly changes?: readonly unknown[];
};

export async function buildProposal(
  input: BuildProposalInput,
): Promise<Result<ProposalOutcome | null, BuildProposalError>> {
  const diffResult = await input.mcp.call("flows.diff", { draftId: input.draftId }, input.identity);
  if (!diffResult.ok) {
    return err({ code: "DIFF_FAILED", message: diffResult.error.message });
  }

  const raw = (diffResult.value ?? {}) as RawDiff;
  const rawList = raw.changes ?? raw.entries ?? [];
  if (rawList.length === 0) {
    return ok(null);
  }

  const entries: readonly DiffEntry[] = rawList.map((item) => {
    if (typeof item === "object" && item !== null && "change" in item) {
      return item as DiffEntry;
    }
    return { change: item } as unknown as DiffEntry;
  });

  const proposalChanges = toProposalChanges(entries);
  const reasoned = await writeReasons(input.llm, proposalChanges, input.context);
  const cards = toDomainCards(reasoned, input.manifests ?? {});

  const proposal: Proposal = {
    id: randomUUID(),
    flowId: input.flowId,
    draftId: input.draftId,
    baseRevision: raw.baseRevision ?? "",
    version: 1,
    status: "pending",
    changes: reasoned,
  };

  return ok({ proposal, cards });
}
