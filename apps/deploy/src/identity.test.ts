import { describe, expect, it } from "vitest";
import { createSupabaseIdentity } from "./identity.ts";

const SUPABASE_URL = "https://project.supabase.co";
const ANON_KEY = "anon-public-key";
const JWT = "header.payload.signature";

type SeenRequest = { readonly url: string; readonly method: string; readonly headers: Headers };

function fakeFetch(respond: () => Response | Promise<Response>): {
  readonly fetch: typeof fetch;
  readonly requests: SeenRequest[];
} {
  const requests: SeenRequest[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: input instanceof Request ? input.url : String(input),
      method: init?.method ?? (input instanceof Request ? input.method : "GET"),
      headers: new Headers(init?.headers ?? (input instanceof Request ? input.headers : {})),
    });
    return respond();
  };
  return { fetch: fetchImpl, requests };
}

const userResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function identityWith(respond: () => Response | Promise<Response>, supabaseUrl = SUPABASE_URL) {
  const fake = fakeFetch(respond);
  return {
    identity: createSupabaseIdentity({ supabaseUrl, anonKey: ANON_KEY, fetch: fake.fetch }),
    requests: fake.requests,
  };
}

describe("createSupabaseIdentity", () => {
  it("resolves a valid bearer token to the user id and the token", async () => {
    const { identity } = identityWith(() => userResponse({ id: "user-1", email: "a@b.c" }));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result).toEqual({ ok: true, value: { userId: "user-1", accessToken: JWT } });
  });

  it("accepts the bearer scheme in any letter case", async () => {
    const { identity } = identityWith(() => userResponse({ id: "user-1" }));

    const result = await identity.resolve(`bearer ${JWT}`);

    expect(result).toEqual({ ok: true, value: { userId: "user-1", accessToken: JWT } });
  });

  it("asks Supabase Auth for the user with the token and the anon key", async () => {
    const { identity, requests } = identityWith(() => userResponse({ id: "user-1" }));

    await identity.resolve(`Bearer ${JWT}`);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(`${SUPABASE_URL}/auth/v1/user`);
    expect(requests[0]?.method).toBe("GET");
    expect(requests[0]?.headers.get("authorization")).toBe(`Bearer ${JWT}`);
    expect(requests[0]?.headers.get("apikey")).toBe(ANON_KEY);
  });

  it("drops a trailing slash from the Supabase URL", async () => {
    const { identity, requests } = identityWith(
      () => userResponse({ id: "user-1" }),
      `${SUPABASE_URL}/`,
    );

    await identity.resolve(`Bearer ${JWT}`);

    expect(requests[0]?.url).toBe(`${SUPABASE_URL}/auth/v1/user`);
  });

  it("rejects a missing header as unauthorized without calling Supabase", async () => {
    const { identity, requests } = identityWith(() => userResponse({ id: "user-1" }));

    const result = await identity.resolve(undefined);

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(requests).toHaveLength(0);
  });

  it.each([[""], ["Bearer"], ["Bearer "], [`Basic ${JWT}`], [JWT]])(
    "rejects the malformed header %j as unauthorized without calling Supabase",
    async (header) => {
      const { identity, requests } = identityWith(() => userResponse({ id: "user-1" }));

      const result = await identity.resolve(header);

      expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
      expect(requests).toHaveLength(0);
    },
  );

  it.each([[401], [403]])("maps a %i from Supabase to unauthorized", async (status) => {
    const { identity } = identityWith(() => userResponse({ message: "invalid JWT" }, status));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });

  it("maps any other failed response to unavailable", async () => {
    const { identity } = identityWith(() => userResponse({ message: "down" }, 500));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it("maps a network failure to unavailable", async () => {
    const { identity } = identityWith(() => Promise.reject(new TypeError("fetch failed")));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result).toMatchObject({ ok: false, error: { code: "UNAVAILABLE" } });
  });

  it.each([[{}], [{ id: 42 }], [null]])(
    "rejects a user body %j without a string id as unauthorized",
    async (body) => {
      const { identity } = identityWith(() => userResponse(body));

      const result = await identity.resolve(`Bearer ${JWT}`);

      expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    },
  );

  it("returns errors with a readable message", async () => {
    const { identity } = identityWith(() => userResponse({}, 401));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result.ok ? "" : result.error.message).not.toBe("");
  });

  it("never includes the token in its errors", async () => {
    const { identity } = identityWith(() => userResponse({ message: `bad token ${JWT}` }, 401));

    const result = await identity.resolve(`Bearer ${JWT}`);

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(JWT);
  });
});
