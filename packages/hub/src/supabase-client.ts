import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type { HubError } from "./hub.ts";

/** Untyped on purpose: every row is parsed at the boundary (hub-rows.ts). */
export const createHubClient = (url: string, publishableKey: string) =>
  createClient(url, publishableKey);
export type HubClient = ReturnType<typeof createHubClient>;

// Postgres error codes the hub's rules raise (see supabase/migrations).
const CHECK_VIOLATION = "23514";
const INSUFFICIENT_PRIVILEGE = "42501";

export function fromPostgrest(error: PostgrestError): HubError {
  switch (error.code) {
    case CHECK_VIOLATION:
      return { kind: "stale-version", detail: error.message };
    case INSUFFICIENT_PRIVILEGE:
      return { kind: "signed-out", detail: error.message };
    default:
      return { kind: "unavailable", detail: error.message };
  }
}
