import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { err, Flow, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { Draft, StoreError, Stores, StoresFor } from "./stores.ts";

const DocumentSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  flow: Flow,
  files: Type.Record(Type.String(), Type.String()),
  updatedAt: Type.Number(),
});
const DraftRowSchema = Type.Object({
  id: Type.String(),
  flow_id: Type.String(),
  base_revision: Type.String(),
  flow: Flow,
});
const FlowRowSchema = Type.Object({ document: DocumentSchema });
export function createSupabaseStores(options: {
  supabaseUrl: string;
  anonKey: string;
  fetch?: typeof fetch;
}): StoresFor {
  return (identity) => {
    const client = createClient(options.supabaseUrl, options.anonKey, {
      global: {
        headers: { Authorization: `Bearer ${identity.accessToken}` },
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return userStores(client, identity.userId);
  };
}
function userStores(client: SupabaseClient, userId: string): Stores {
  return {
    flows: {
      read: (flowId) =>
        attempt(async () => {
          const result = await client
            .from("flows")
            .select("document")
            .eq("owner_id", userId)
            .eq("id", flowId)
            .maybeSingle();
          if (result.error !== null) return err({ message: result.error.message });
          if (result.data === null) return ok(undefined);
          const row = parse(FlowRowSchema, result.data);
          return row.ok ? ok(row.value.document) : err({ message: "Invalid stored flow document" });
        }),
      search: (query) => searchFlows(client, { query, userId }),
      write: (document) =>
        attempt(async () => {
          const result = await client.from("flows").upsert({ id: document.id, document });
          return result.error === null ? ok(undefined) : err({ message: result.error.message });
        }),
    },
    drafts: {
      create: (draft) => writeDraft(client, { draft, userId, method: "create" }),
      update: (draft) => writeDraft(client, { draft, userId, method: "update" }),
      read: (draftId) => readDraft(client, { draftId, userId }),
      remove: (draftId) =>
        attempt(async () => {
          const result = await client
            .from("flow_drafts")
            .delete()
            .eq("owner_id", userId)
            .eq("id", draftId);
          return result.error === null ? ok(undefined) : err({ message: result.error.message });
        }),
    },
  };
}
async function searchFlows(
  client: SupabaseClient,
  { query, userId }: { query: string; userId: string },
): Promise<Result<readonly { id: string; name: string }[], StoreError>> {
  return attempt(async () => {
    const result = await client.from("flows").select("document").eq("owner_id", userId);
    if (result.error !== null) return err({ message: result.error.message });
    return ok(
      result.data.flatMap((value: unknown) => {
        const row = parse(FlowRowSchema, value);
        return row.ok &&
          `${row.value.document.id} ${row.value.document.name}`
            .toLowerCase()
            .includes(query.toLowerCase())
          ? [{ id: row.value.document.id, name: row.value.document.name }]
          : [];
      }),
    );
  });
}
async function readDraft(
  client: SupabaseClient,
  { draftId, userId }: { draftId: string; userId: string },
): Promise<Result<Draft | undefined, StoreError>> {
  return attempt(async () => {
    const result = await client
      .from("flow_drafts")
      .select("id,flow_id,base_revision,flow")
      .eq("owner_id", userId)
      .eq("id", draftId)
      .maybeSingle();
    if (result.error !== null) return err({ message: result.error.message });
    if (result.data === null) return ok(undefined);
    const row = parse(DraftRowSchema, result.data);
    return row.ok
      ? ok({
          id: row.value.id,
          flowId: row.value.flow_id,
          baseRevision: row.value.base_revision,
          flow: row.value.flow,
        })
      : err({ message: "Invalid stored draft" });
  });
}
async function writeDraft(
  client: SupabaseClient,
  { draft, userId, method }: { draft: Draft; userId: string; method: "create" | "update" },
): Promise<Result<void, StoreError>> {
  return attempt(async () => {
    const result =
      method === "create"
        ? await client.from("flow_drafts").insert({
            id: draft.id,
            owner_id: userId,
            flow_id: draft.flowId,
            base_revision: draft.baseRevision,
            flow: draft.flow,
          })
        : await client
            .from("flow_drafts")
            .update({ flow: draft.flow, base_revision: draft.baseRevision })
            .eq("owner_id", userId)
            .eq("id", draft.id);
    return result.error === null ? ok(undefined) : err({ message: result.error.message });
  });
}
async function attempt<T>(
  run: () => Promise<Result<T, StoreError>>,
): Promise<Result<T, StoreError>> {
  try {
    return await run();
  } catch {
    return err({ message: "Flow storage is unavailable" });
  }
}
