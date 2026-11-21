import { err, ok, type Result } from "@nodomics/protocol";
import type { Proposal, ProposalChange } from "../contracts/proposal.ts";

export type AcceptError = { readonly kind: "unknown_change"; readonly changeId: string };

function includeDependencies(
  id: string,
  byId: ReadonlyMap<string, ProposalChange>,
  selected: Set<string>,
): void {
  if (selected.has(id)) return;
  selected.add(id);
  byId.get(id)?.dependsOn.forEach((dependency) => {
    includeDependencies(dependency, byId, selected);
  });
}

export function selectChanges(
  proposal: Proposal,
  acceptedIds: readonly string[],
): Result<ProposalChange[], AcceptError> {
  const byId = new Map(proposal.changes.map((change) => [change.id, change]));
  const unknownId = acceptedIds.find((id) => !byId.has(id));
  if (unknownId !== undefined) return err({ kind: "unknown_change", changeId: unknownId });
  const selected = new Set<string>();
  acceptedIds.forEach((id) => {
    includeDependencies(id, byId, selected);
  });
  return ok(proposal.changes.filter((change) => selected.has(change.id)));
}
