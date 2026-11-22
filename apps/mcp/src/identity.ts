import { err, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";

export type UserIdentity = { readonly userId: string; readonly accessToken: string };
export type AuthError = { readonly code: "UNAUTHORIZED" | "UNAVAILABLE"; readonly message: string };
export interface IdentityPort {
  readonly resolve: (authorization: string | undefined) => Promise<Result<UserIdentity, AuthError>>;
}
const User = Type.Object({ id: Type.String({ minLength: 1 }) });
const unauthorized = (): Result<never, AuthError> =>
  err({ code: "UNAUTHORIZED", message: "Sign in with a valid bearer token" });
const unavailable = (): Result<never, AuthError> =>
  err({ code: "UNAVAILABLE", message: "Identity service is unavailable" });
export function createSupabaseIdentity(options: {
  supabaseUrl: string;
  anonKey: string;
  fetch: typeof fetch;
}): IdentityPort {
  return {
    resolve: async (authorization) => {
      const accessToken = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
      if (accessToken === undefined) return unauthorized();
      try {
        const response = await options.fetch(
          `${options.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}`, apikey: options.anonKey },
          },
        );
        if (response.status === 401 || response.status === 403) return unauthorized();
        if (!response.ok) return unavailable();
        const user = parse(User, await response.json());
        return user.ok ? ok({ userId: user.value.id, accessToken }) : unauthorized();
      } catch {
        return unavailable();
      }
    },
  };
}
