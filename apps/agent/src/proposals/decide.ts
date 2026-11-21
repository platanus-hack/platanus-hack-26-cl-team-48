import { err, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { Proposal } from "../contracts/proposal.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";
import type { ProposalStorePort } from "./proposal-store-port.ts";
import { nextStatus } from "./proposal-status.ts";
import { selectChanges } from "./select-changes.ts";

export type DecisionError = {
  readonly code:
    | "NOT_FOUND"
    | "VERSION_CONFLICT"
    | "STALE"
    | "INVALID_CHANGE"
    | "UPSTREAM_FAILED"
    | "STORE_FAILED";
};
export type DecisionInput = {
  readonly store: ProposalStorePort;
  readonly mcp: McpPort;
  readonly identity: UserIdentity;
  readonly proposalId: string;
  readonly acceptedIds: readonly string[];
  readonly expectedVersion: number;
};

const DiffResult = Type.Object({ stale: Type.Boolean(), baseRevision: Type.String() });
const ApplyResult = Type.Object({
  flowId: Type.String(),
  revision: Type.String(),
  applied: Type.Array(Type.String()),
});

async function persistStatus(
  input: DecisionInput,
  proposal: Proposal,
  status: Proposal["status"],
): Promise<Result<Proposal, DecisionError>> {
  const saved = await input.store.updateStatus({
    id: proposal.id,
    ownerId: input.identity.userId,
    expectedVersion: input.expectedVersion,
    status,
  });
  return saved.ok
    ? ok({ ...proposal, status, version: proposal.version + 1 })
    : err({ code: saved.error.code });
}

async function applySelection(
  input: DecisionInput,
  proposal: Proposal,
  changeIds: readonly string[],
): Promise<Result<void, DecisionError>> {
  if (changeIds.length === 0) return ok(undefined);
  const applied = await input.mcp.call(
    "flows.apply",
    { draftId: proposal.draftId, changeIds, baseRevision: proposal.baseRevision },
    input.identity,
  );
  return applied.ok && parse(ApplyResult, applied.value).ok
    ? ok(undefined)
    : err({ code: "UPSTREAM_FAILED" });
}

async function readStatus(
  input: DecisionInput,
  proposal: Proposal,
  acceptedIds: readonly string[],
): Promise<Result<Proposal["status"], DecisionError>> {
  const diff = await input.mcp.call("flows.diff", { draftId: proposal.draftId }, input.identity);
  if (!diff.ok) return err({ code: "UPSTREAM_FAILED" });
  const parsed = parse(DiffResult, diff.value);
  if (!parsed.ok) return err({ code: "UPSTREAM_FAILED" });
  return ok(
    nextStatus(proposal, {
      currentRevision: parsed.value.stale
        ? `${proposal.baseRevision}:stale`
        : parsed.value.baseRevision,
      acceptedIds,
    }),
  );
}

async function finishDecision(
  input: DecisionInput,
  proposal: Proposal,
  selection: { readonly status: Proposal["status"]; readonly changeIds: readonly string[] },
): Promise<Result<Proposal, DecisionError>> {
  if (selection.status === "stale") {
    const saved = await persistStatus(input, proposal, "stale");
    return saved.ok ? err({ code: "STALE" }) : saved;
  }
  const applied = await applySelection(input, proposal, selection.changeIds);
  return applied.ok ? persistStatus(input, proposal, selection.status) : applied;
}

async function decideStored(
  input: DecisionInput,
  proposal: Proposal,
): Promise<Result<Proposal, DecisionError>> {
  if (proposal.version !== input.expectedVersion || proposal.status !== "pending") {
    return err({ code: "VERSION_CONFLICT" });
  }
  const selected = selectChanges(proposal, input.acceptedIds);
  if (!selected.ok) return err({ code: "INVALID_CHANGE" });
  const changeIds = selected.value.map(({ id }) => id);
  const status = await readStatus(input, proposal, changeIds);
  return status.ok ? finishDecision(input, proposal, { status: status.value, changeIds }) : status;
}

export async function decideProposal(
  input: DecisionInput,
): Promise<Result<Proposal, DecisionError>> {
  const found = await input.store.get(input.proposalId, input.identity.userId);
  return found.ok ? decideStored(input, found.value.proposal) : err({ code: found.error.code });
}
