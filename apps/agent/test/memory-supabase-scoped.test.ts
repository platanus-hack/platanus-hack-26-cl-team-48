import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createUserScopedMemory } from "../src/memory/supabase-memory.ts";

const URL = "https://project.supabase.co";
const USER_TOKEN = "user-jwt-token";

const jwt = (role: string): string =>
  `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ role }))}.sig`;

type Factory = (url: string, key: string, options: Record<string, unknown>) => SupabaseClient;

function recordingFactory() {
  const calls: { url: string; key: string; options: Record<string, unknown> }[] = [];
  // The fake client is never queried in these tests.
  const factory: Factory = (url, key, options) => {
    calls.push({ url, key, options });
    return {} as unknown as SupabaseClient;
  };
  return { factory, calls };
}

describe("createUserScopedMemory", () => {
  it("uses the user access token, never a service key", () => {
    const { factory, calls } = recordingFactory();
    const anonKey = jwt("anon");
    const result = createUserScopedMemory(
      { supabaseUrl: URL, anonKey, accessToken: USER_TOKEN },
      factory,
    );
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(URL);
    expect(calls[0]?.key).toBe(anonKey);
    expect(calls[0]?.options).toMatchObject({
      global: { headers: { Authorization: `Bearer ${USER_TOKEN}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("refuses a service role key and builds no client", () => {
    const { factory, calls } = recordingFactory();
    const result = createUserScopedMemory(
      { supabaseUrl: URL, anonKey: jwt("service_role"), accessToken: USER_TOKEN },
      factory,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "STORE_FAILED" } });
    expect(calls).toHaveLength(0);
  });

  it("refuses an empty access token", () => {
    const { factory, calls } = recordingFactory();
    const result = createUserScopedMemory(
      { supabaseUrl: URL, anonKey: jwt("anon"), accessToken: "" },
      factory,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "STORE_FAILED" } });
    expect(calls).toHaveLength(0);
  });
});
