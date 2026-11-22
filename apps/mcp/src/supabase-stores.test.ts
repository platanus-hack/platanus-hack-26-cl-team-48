import { describe, expect, it } from "vitest";
import { createSupabaseStores } from "./supabase-stores.ts";
import { ALICE, SALES_FLOW, salesDocument } from "./tools.fixtures.ts";

const URL = "https://project.supabase.co";
const PUBLIC_KEY = "public-test-key";

type SeenRequest = {
  readonly url: string;
  readonly headers: Headers;
  readonly method: string;
  readonly body: unknown;
};

function fakeDatabase(responseBody: unknown = []) {
  const requests: SeenRequest[] = [];
  const requestFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const text = await request.text();
    const body: unknown = text === "" ? undefined : JSON.parse(text);
    requests.push({ url: request.url, method: request.method, headers: request.headers, body });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { requests, fetch: requestFetch };
}

describe("Supabase stores", () => {
  it("updates an existing flow using only columns the authenticated user may update", async () => {
    const database = fakeDatabase();
    const storesFor = createSupabaseStores({
      supabaseUrl: URL,
      anonKey: PUBLIC_KEY,
      fetch: database.fetch,
    });
    const document = salesDocument({ ...SALES_FLOW, name: "Changed" });

    const result = await storesFor(ALICE).flows.write(document);

    expect(result.ok).toBe(true);
    expect(database.requests).toHaveLength(1);
    expect(database.requests[0]?.method).toBe("POST");
    expect(database.requests[0]?.url).toContain("/rest/v1/flows");
    expect(database.requests[0]?.body).toEqual({ id: document.id, document });
    expect(database.requests[0]?.headers.get("authorization")).toBe(`Bearer ${ALICE.accessToken}`);
    expect(database.requests[0]?.headers.get("apikey")).toBe(PUBLIC_KEY);
  });

  it("parses the saved document at the network boundary", async () => {
    const database = fakeDatabase({ document: salesDocument() });
    const storesFor = createSupabaseStores({
      supabaseUrl: URL,
      anonKey: PUBLIC_KEY,
      fetch: database.fetch,
    });

    const result = await storesFor(ALICE).flows.read("ventas");

    expect(result).toEqual({ ok: true, value: salesDocument() });
    expect(database.requests[0]?.headers.get("authorization")).toBe(`Bearer ${ALICE.accessToken}`);
  });

  it("rejects a stored document with an invalid flow instead of trusting the response", async () => {
    const database = fakeDatabase({ document: { ...salesDocument(), flow: { nodes: "invalid" } } });
    const storesFor = createSupabaseStores({
      supabaseUrl: URL,
      anonKey: PUBLIC_KEY,
      fetch: database.fetch,
    });

    const result = await storesFor(ALICE).flows.read("ventas");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).not.toBe("");
  });
});
