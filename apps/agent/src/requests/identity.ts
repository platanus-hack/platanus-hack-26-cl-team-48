import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { err, ok, type Result } from "@nodomics/protocol";
import type { UserIdentity } from "../mcp/mcp-port.ts";

export type AuthError = {
  readonly code: "UNAUTHORIZED" | "UNAVAILABLE";
  readonly message: string;
};

export type IdentityPort = {
  readonly resolve: (bearer: string | undefined) => Promise<Result<UserIdentity, AuthError>>;
};

export type SupabaseIdentityOptions = {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly fetch: typeof fetch;
};

const BEARER_PATTERN = /^bearer\s+(\S+)$/i;
const HTTP_UNAUTHORIZED = [401, 403];
const SupabaseUser = Type.Object({ id: Type.String({ minLength: 1 }) });
const DEV_IDENTITY: UserIdentity = { userId: "dev-user", accessToken: "dev-token" };

const fail = (code: AuthError["code"], message: string): Result<never, AuthError> =>
  err({ code, message });

export function parseBearer(header: string | undefined): string | undefined {
  return header === undefined ? undefined : BEARER_PATTERN.exec(header.trim())?.[1];
}

async function fetchUser(
  options: SupabaseIdentityOptions,
  bearer: string,
): Promise<Result<UserIdentity, AuthError>> {
  const response = await options.fetch(`${options.supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearer}`, apikey: options.anonKey },
  });
  if (HTTP_UNAUTHORIZED.includes(response.status)) return fail("UNAUTHORIZED", "Invalid token");
  if (!response.ok) return fail("UNAVAILABLE", "The auth service failed");
  const body: unknown = await response.json();
  return Value.Check(SupabaseUser, body)
    ? ok({ userId: body.id, accessToken: bearer })
    : fail("UNAUTHORIZED", "Invalid token");
}

export function createSupabaseIdentity(options: SupabaseIdentityOptions): IdentityPort {
  return {
    resolve: async (bearer) => {
      if (bearer === undefined) return fail("UNAUTHORIZED", "Missing bearer token");
      try {
        return await fetchUser(options, bearer);
      } catch {
        return fail("UNAVAILABLE", "The auth service is unreachable");
      }
    },
  };
}

/** Only for local development: start.ts wires it when AGENT_DEV_IDENTITY=1. */
export function createDevIdentity(): IdentityPort {
  return { resolve: () => Promise.resolve(ok(DEV_IDENTITY)) };
}
