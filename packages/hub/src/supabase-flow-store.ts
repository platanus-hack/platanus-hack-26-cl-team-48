import { err, ok } from "@nodomics/protocol";
import type { PostgrestError } from "@supabase/supabase-js";
import type { FlowStore, StoredFlow } from "./flow-store.ts";
import type { HubError, HubResult } from "./hub.ts";
import { toStoredFlow } from "./hub-rows.ts";
import { fromPostgrest, INSUFFICIENT_PRIVILEGE, type HubClient } from "./supabase-client.ts";

const FLOWS_TABLE = "flows";
const INVALID_ROW: HubError = { kind: "invalid", detail: "flows row" };

/** Saved flows in the `flows` table (ADR 0023); row level security decides who sees what. */
export function createSupabaseFlowStore(client: HubClient): FlowStore {
  return {
    listOwnFlows: async () => {
      const ownerId = await signedInUserId(client);
      if (ownerId === undefined) return err({ kind: "signed-out" });
      const { data, error } = await client
        .from(FLOWS_TABLE)
        .select()
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });
      return error === null ? toStoredFlows(data) : err(fromPostgrest(error));
    },
    readFlow: async (id) => {
      const { data, error }: SingleRow = await client
        .from(FLOWS_TABLE)
        .select()
        .eq("id", id)
        .maybeSingle();
      if (error !== null) return err(fromPostgrest(error));
      return data === null ? ok(undefined) : storedFlowOrInvalid(data);
    },
    saveOwnFlow: async (draft) => {
      if ((await signedInUserId(client)) === undefined) return err({ kind: "signed-out" });
      // Without `visibility` the upsert leaves the column alone, or uses its default when new.
      const { error } = await client.from(FLOWS_TABLE).upsert(draft);
      return error === null ? ok(undefined) : err(fromWrite(error));
    },
    deleteOwnFlow: async (id) => {
      if ((await signedInUserId(client)) === undefined) return err({ kind: "signed-out" });
      const { error } = await client.from(FLOWS_TABLE).delete().eq("id", id);
      return error === null ? ok(undefined) : err(fromWrite(error));
    },
  };
}

type SingleRow = { readonly data: unknown; readonly error: PostgrestError | null };

async function signedInUserId(client: HubClient): Promise<string | undefined> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id;
}

function toStoredFlows(rows: unknown[] | null): HubResult<ReadonlyArray<StoredFlow>> {
  const flows: StoredFlow[] = [];
  for (const row of rows ?? []) {
    const flow = toStoredFlow(row);
    if (flow === undefined) return err(INVALID_ROW);
    flows.push(flow);
  }
  return ok(flows);
}

function storedFlowOrInvalid(row: unknown): HubResult<StoredFlow | undefined> {
  const flow = toStoredFlow(row);
  return flow === undefined ? err(INVALID_ROW) : ok(flow);
}

/** Signed in already, so row level security refusing it means the flow is someone else's. */
function fromWrite(error: PostgrestError): HubError {
  return error.code === INSUFFICIENT_PRIVILEGE
    ? { kind: "invalid", detail: error.message }
    : fromPostgrest(error);
}
