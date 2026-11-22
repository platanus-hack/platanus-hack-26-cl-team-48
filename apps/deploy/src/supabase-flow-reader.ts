import { createClient } from "@supabase/supabase-js";
import { err, Flow, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { StoreError } from "./deployment-store.ts";
import type { FlowReader } from "./flow-reader.ts";

const FlowRow = Type.Object({ document: Type.Object({ flow: Flow }) });

/**
 * Reads the saved flow with the user's JWT, so RLS applies. RLS also lets anyone read public flows,
 * so the reader filters by owner too: a user only deploys their own flows.
 */
export function createSupabaseFlowReader(options: {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly fetch?: typeof fetch;
}): FlowReader {
  return {
    read: async (identity, flowId) => {
      try {
        const result = await createClient(options.supabaseUrl, options.anonKey, {
          global: {
            headers: { Authorization: `Bearer ${identity.accessToken}` },
            ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
          },
          auth: { persistSession: false, autoRefreshToken: false },
        })
          .from("flows")
          .select("document")
          .eq("owner_id", identity.userId)
          .eq("id", flowId)
          .maybeSingle();
        if (result.error !== null) return err({ message: result.error.message });
        return result.data === null ? ok(undefined) : flowOf(result.data);
      } catch {
        return err({ message: "Flow storage is unavailable" });
      }
    },
  };
}

function flowOf(row: unknown): Result<Flow, StoreError> {
  const parsed = parse(FlowRow, row);
  return parsed.ok
    ? ok(parsed.value.document.flow)
    : err({ message: "Invalid stored flow document" });
}
