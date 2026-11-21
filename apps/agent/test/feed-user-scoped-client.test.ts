import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createUserScopedClient } from "../src/supabase/user-scoped-client.ts";

const URL = "https://project.supabase.co";
const USER_TOKEN = "user-jwt-token";

const jwt = (role: string): string =>
  `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ role }))}.sig`;

type Factory = (url: string, key: string, options: Record<string, unknown>) => SupabaseClient;

function recordingFactory() {
  const calls: { url: string; key: string; options: Record<string, unknown> }[] = [];
  const factory: Factory = (url, key, options) => {
    calls.push({ url, key, options });
    return {} as unknown as SupabaseClient;
  };
  return { factory, calls };
}

describe("createUserScopedClient", () => {
  it("builds the client with the user token and no session persistence", () => {
    const { factory, calls } = recordingFactory();
    const anonKey = jwt("anon");

    const result = createUserScopedClient({ url: URL, anonKey, accessToken: USER_TOKEN }, factory);

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(URL);
    expect(calls[0]?.key).toBe(anonKey);
    expect(calls[0]?.options).toMatchObject({
      global: { headers: { Authorization: `Bearer ${USER_TOKEN}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("refuses an empty access token and builds no client", () => {
    const { factory, calls } = recordingFactory();

    const result = createUserScopedClient(
      { url: URL, anonKey: jwt("anon"), accessToken: "" },
      factory,
    );

    expect(result).toEqual({ ok: false, error: { code: "MISSING_TOKEN" } });
    expect(calls).toHaveLength(0);
  });

  it("refuses a service role key and builds no client", () => {
    const { factory, calls } = recordingFactory();

    const result = createUserScopedClient(
      { url: URL, anonKey: jwt("service_role"), accessToken: USER_TOKEN },
      factory,
    );

    expect(result).toEqual({ ok: false, error: { code: "SERVICE_ROLE_KEY" } });
    expect(calls).toHaveLength(0);
  });
});
