import { describe, expect, it } from "vitest";
import { createSupabaseFlowReader } from "./supabase-flow-reader.ts";
import { deployFlow } from "./testing/deploy-flows.ts";
import type { UserIdentity } from "./types.ts";

const SUPABASE_URL = "https://project.supabase.test";
const ANON_KEY = "anon-public-key";
const USER: UserIdentity = { userId: "user-1", accessToken: "tok" };
const FLOW = deployFlow();

type SeenRequest = { readonly url: URL; readonly method: string; readonly headers: Headers };

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Answers like PostgREST: a GET on a table returns a JSON array of rows. */
function fakeSupabase(answer: () => Response) {
  const requests: SeenRequest[] = [];
  const fetchImpl = (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push({ url: new URL(request.url), method: request.method, headers: request.headers });
    return Promise.resolve(answer());
  };
  const reader = createSupabaseFlowReader({
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON_KEY,
    fetch: fetchImpl,
  });
  return { reader, requests };
}

describe("createSupabaseFlowReader", () => {
  it("reads the flows table with a GET", async () => {
    const { reader, requests } = fakeSupabase(() => json([]));

    await reader.read(USER, "flow-9");

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe("GET");
    expect(`${requests[0]?.url.origin ?? ""}${requests[0]?.url.pathname ?? ""}`).toBe(
      `${SUPABASE_URL}/rest/v1/flows`,
    );
  });

  it("filters by the owner and by the flow id", async () => {
    const { reader, requests } = fakeSupabase(() => json([]));

    await reader.read(USER, "flow-9");

    expect(requests[0]?.url.searchParams.getAll("owner_id")).toEqual(["eq.user-1"]);
    expect(requests[0]?.url.searchParams.getAll("id")).toEqual(["eq.flow-9"]);
  });

  it("sends the access token of the user as a bearer token", async () => {
    const { reader, requests } = fakeSupabase(() => json([]));

    await reader.read(USER, "flow-9");

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer tok");
  });

  it("reads a missing flow as undefined", async () => {
    const { reader } = fakeSupabase(() => json([]));

    const result = await reader.read(USER, "flow-9");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("returns the flow saved in the document of the row", async () => {
    const { reader } = fakeSupabase(() => json([{ document: { flow: FLOW } }]));

    const result = await reader.read(USER, "flow-9");

    expect(result).toEqual({ ok: true, value: FLOW });
  });

  it("returns an error when Supabase fails", async () => {
    const { reader } = fakeSupabase(() =>
      json({ code: "XX000", message: "internal error", details: null, hint: null }, 500),
    );

    const result = await reader.read(USER, "flow-9");

    expect(result.ok).toBe(false);
  });
});
