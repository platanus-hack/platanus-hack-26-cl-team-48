import { describe, expect, it } from "vitest";
import {
  createDevIdentity,
  createSupabaseIdentity,
  parseBearer,
} from "../src/requests/identity.ts";

const SUPABASE_URL = "https://supabase.example";
const ANON_KEY = "fixture-anon";

type Seen = { url: string; headers: Headers };

function fetchReplying(response: Response | Error) {
  const seen: Seen[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    seen.push({
      url: typeof input === "string" ? input : "unexpected",
      headers: new Headers(init?.headers),
    });
    return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  };
  return {
    seen,
    identity: createSupabaseIdentity({
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
      fetch: fetchImpl,
    }),
  };
}

describe("supabase identity", () => {
  it("missing bearer is unauthorized", async () => {
    const { identity, seen } = fetchReplying(new Response("{}"));

    expect(await identity.resolve(undefined)).toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(seen).toHaveLength(0);
  });

  it("invalid jwt is unauthorized", async () => {
    const { identity } = fetchReplying(new Response("{}", { status: 401 }));

    expect(await identity.resolve("bad-jwt")).toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("valid jwt yields user identity", async () => {
    const { identity, seen } = fetchReplying(Response.json({ id: "user-1", email: "a@b.c" }));

    expect(await identity.resolve("good-jwt")).toEqual({
      ok: true,
      value: { userId: "user-1", accessToken: "good-jwt" },
    });
    expect(seen[0]?.url).toBe(`${SUPABASE_URL}/auth/v1/user`);
    expect(seen[0]?.headers.get("authorization")).toBe("Bearer good-jwt");
    expect(seen[0]?.headers.get("apikey")).toBe(ANON_KEY);
  });

  it("a malformed user payload is unauthorized", async () => {
    const { identity } = fetchReplying(Response.json({ nope: true }));

    expect(await identity.resolve("good-jwt")).toMatchObject({ ok: false });
  });

  it("an unreachable auth service is unavailable", async () => {
    const { identity } = fetchReplying(new Error("boom"));

    expect(await identity.resolve("good-jwt")).toMatchObject({
      ok: false,
      error: { code: "UNAVAILABLE" },
    });
  });

  it("a failing auth service is unavailable", async () => {
    const { identity } = fetchReplying(new Response("{}", { status: 500 }));

    expect(await identity.resolve("good-jwt")).toMatchObject({
      ok: false,
      error: { code: "UNAVAILABLE" },
    });
  });
});

describe("dev identity", () => {
  it("resolves a fixed user without a bearer", async () => {
    const result = await createDevIdentity().resolve(undefined);

    expect(result).toMatchObject({ ok: true, value: { userId: "dev-user" } });
  });
});

describe("parseBearer", () => {
  it.each([
    ["Bearer abc", "abc"],
    ["bearer abc", "abc"],
    ["Basic abc", undefined],
    ["Bearer ", undefined],
    [undefined, undefined],
  ])("parses %j", (header, expected) => {
    expect(parseBearer(header)).toBe(expected);
  });
});
