import type { Proposal } from "../contracts/proposal.ts";

export type ProposalStatus = Proposal["status"];

export function nextStatus(
  proposal: Proposal,
  selection: { readonly currentRevision: string; readonly acceptedIds: readonly string[] },
): ProposalStatus {
  if (selection.currentRevision !== proposal.baseRevision) return "stale";
  if (selection.acceptedIds.length === 0) return "rejected";
  return selection.acceptedIds.length === proposal.changes.length
    ? "accepted"
    : "partially_accepted";
}
