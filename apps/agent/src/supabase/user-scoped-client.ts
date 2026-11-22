import { err, ok, type Result } from "@nodomics/protocol";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type UserScopedClientConfig = {
  readonly url: string;
  readonly anonKey: string;
  readonly accessToken: string;
};

export type UserScopedClientError =
  { readonly code: "MISSING_TOKEN" } | { readonly code: "SERVICE_ROLE_KEY" };

export type ClientFactory = (
  url: string,
  key: string,
  options: {
    readonly global: { readonly headers: Readonly<Record<string, string>> };
    readonly auth: { readonly persistSession: false; readonly autoRefreshToken: false };
  },
) => SupabaseClient;

const SERVICE_ROLE = "service_role";
const JWT_PAYLOAD_INDEX = 1;

/** Non-JWT keys have no readable role; that is not an error here. */
function jwtRole(key: string): unknown {
  try {
    const payload: unknown = JSON.parse(atob(key.split(".")[JWT_PAYLOAD_INDEX] ?? ""));
    return typeof payload === "object" && payload !== null && "role" in payload
      ? payload.role
      : undefined;
  } catch {
    return undefined;
  }
}

/** A client that acts as the user, so row level security applies and never a service key. */
export function createUserScopedClient(
  config: UserScopedClientConfig,
  factory: ClientFactory = createClient,
): Result<SupabaseClient, UserScopedClientError> {
  if (config.accessToken === "") return err({ code: "MISSING_TOKEN" });
  if (jwtRole(config.anonKey) === SERVICE_ROLE) return err({ code: "SERVICE_ROLE_KEY" });
  return ok(
    factory(config.url, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${config.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
}
