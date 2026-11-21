import { err, ok, type Result } from "@nodomics/protocol";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProposalStoreError,
  ProposalStorePort,
  StoredProposal,
} from "./proposal-store-port.ts";

type ProposalRow = {
  readonly id: string;
  readonly owner_id: string;
  readonly flow_id: string;
  readonly draft_id: string;
  readonly base_revision: string;
  readonly version: number;
  readonly status: StoredProposal["proposal"]["status"];
  readonly changes: StoredProposal["proposal"]["changes"];
  readonly cards: StoredProposal["cards"];
};

export function createSupabaseProposalStore(client: SupabaseClient): ProposalStorePort {
  const save = async (stored: StoredProposal): Promise<Result<void, ProposalStoreError>> => {
    const row = {
      id: stored.proposal.id,
      owner_id: stored.ownerId,
      flow_id: stored.proposal.flowId,
      draft_id: stored.proposal.draftId,
      base_revision: stored.proposal.baseRevision,
      version: stored.proposal.version,
      status: stored.proposal.status,
      changes: stored.proposal.changes,
      cards: stored.cards,
    };
    const { error } = await client.from("agent_proposals").insert(row);
    if (error) return err({ code: "STORE_FAILED", message: error.message });
    return ok(undefined);
  };

  const get = async (
    id: string,
    ownerId: string,
  ): Promise<Result<StoredProposal, ProposalStoreError>> => {
    const response = await client
      .from("agent_proposals")
      .select()
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (response.error) return err({ code: "STORE_FAILED", message: response.error.message });
    if (!response.data) return err({ code: "NOT_FOUND", message: `Proposal "${id}" not found` });
    const row = response.data as ProposalRow;
    return ok({
      proposal: {
        id: row.id,
        flowId: row.flow_id,
        draftId: row.draft_id,
        baseRevision: row.base_revision,
        version: row.version,
        status: row.status,
        changes: row.changes,
      },
      cards: row.cards,
      ownerId: row.owner_id,
    });
  };

  const updateStatus = async (input: {
    readonly id: string;
    readonly ownerId: string;
    readonly expectedVersion: number;
    readonly status: StoredProposal["proposal"]["status"];
  }): Promise<Result<void, ProposalStoreError>> => {
    const response = await client
      .from("agent_proposals")
      .update({ status: input.status, version: input.expectedVersion + 1 })
      .eq("id", input.id)
      .eq("owner_id", input.ownerId)
      .eq("version", input.expectedVersion)
      .select();
    if (response.error) return err({ code: "STORE_FAILED", message: response.error.message });
    const rows = response.data;
    if (rows.length === 0) {
      const existingRes = await client
        .from("agent_proposals")
        .select("version")
        .eq("id", input.id)
        .eq("owner_id", input.ownerId)
        .maybeSingle();
      if (!existingRes.data)
        return err({ code: "NOT_FOUND", message: `Proposal "${input.id}" not found` });
      const currentVersion = String((existingRes.data as Record<string, unknown>)["version"]);
      return err({
        code: "VERSION_CONFLICT",
        message: `Expected version ${String(input.expectedVersion)} but found ${currentVersion}`,
      });
    }
    return ok(undefined);
  };

  return { save, get, updateStatus };
}
