import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseFeedStore } from "../src/feed/supabase-feed-store.ts";
import type { StoredProfileCard } from "../src/feed/feed-store-port.ts";
import { hit, validCard } from "./feed-fixtures.ts";

type Reply = { data: unknown; error: { message: string } | null };
type Call = { table: string; steps: [string, unknown[]][] };

/** A chainable, awaitable query builder that records every step and replies per table. */
function fakeClient(replyFor: (table: string) => Reply) {
  const calls: Call[] = [];
  const rpcCalls: [string, unknown][] = [];
  const builder = (call: Call): unknown => {
    const reply = replyFor(call.table);
    const single = Array.isArray(reply.data) ? reply.data[0] : reply.data;
    const proxy: unknown = new Proxy(() => undefined, {
      get: (_target, name: string) => {
        if (name === "then") {
          return (resolve: (value: Reply) => unknown) => resolve(reply);
        }
        return (...args: unknown[]) => {
          call.steps.push([name, args]);
          if (name === "maybeSingle" || name === "single") {
            return Promise.resolve({ ...reply, data: single ?? null });
          }
          return proxy;
        };
      },
    });
    return proxy;
  };
  const client = {
    from: (table: string) => {
      const call: Call = { table, steps: [] };
      calls.push(call);
      return builder(call);
    },
    rpc: (name: string, args: unknown) => {
      rpcCalls.push([name, args]);
      return Promise.resolve(replyFor(`rpc:${name}`));
    },
  } as unknown as SupabaseClient;
  return { client, calls, rpcCalls };
}

const ROW: StoredProfileCard = {
  profileId: "p1",
  card: validCard(),
  offersEmbedding: [0.5, 0.25],
  seeksEmbedding: [1, 0],
  contentHash: "h",
  embeddingModel: "voyage-4",
};

const upsertPayload = (calls: Call[]): unknown =>
  calls.find((call) => call.table === "profile_cards")?.steps.find(([n]) => n === "upsert")?.[1][0];

describe("createSupabaseFeedStore upsertCard", () => {
  it("writes the profile_cards row with serialized vectors", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));

    const result = await createSupabaseFeedStore(client).upsertCard(ROW);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(upsertPayload(calls)).toMatchObject({
      profile_id: "p1",
      card: ROW.card,
      schema_version: 1,
      offers_embedding: "[0.5,0.25]",
      seeks_embedding: "[1,0]",
      content_hash: "h",
      embedding_model: "voyage-4",
    });
  });

  it("writes a null seeks embedding when there are no seeks", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));

    await createSupabaseFeedStore(client).upsertCard({ ...ROW, seeksEmbedding: undefined });

    expect(upsertPayload(calls)).toMatchObject({ seeks_embedding: null });
  });

  it("maps a client error to STORE_ERROR", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));

    const result = await createSupabaseFeedStore(client).upsertCard(ROW);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });
});

describe("createSupabaseFeedStore getOwnCard", () => {
  const dbRow = {
    profile_id: "p1",
    card: validCard(),
    schema_version: 1,
    offers_embedding: "[0.5,0.25]",
    seeks_embedding: "[1,0]",
    content_hash: "h",
    embedding_model: "voyage-4",
  };

  it("selects from profile_cards by profile id", async () => {
    const { client, calls } = fakeClient(() => ({ data: dbRow, error: null }));

    await createSupabaseFeedStore(client).getOwnCard("p1");

    const call = calls.find((c) => c.table === "profile_cards");
    expect(call?.steps.map(([name]) => name)).toContain("select");
    expect(call?.steps.some(([name, args]) => name === "eq" && args.includes("p1"))).toBe(true);
  });

  it("returns undefined when no row exists", async () => {
    const { client } = fakeClient(() => ({ data: null, error: null }));

    const result = await createSupabaseFeedStore(client).getOwnCard("p1");

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("returns the parsed card with its hash and model", async () => {
    const { client } = fakeClient(() => ({ data: dbRow, error: null }));

    const result = await createSupabaseFeedStore(client).getOwnCard("p1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.card).toEqual(validCard());
      expect(result.value?.contentHash).toBe("h");
      expect(result.value?.embeddingModel).toBe("voyage-4");
      expect(result.value?.profileId).toBe("p1");
    }
  });

  it("returns STORE_ERROR when the stored card cannot be parsed", async () => {
    const { client } = fakeClient(() => ({
      data: { ...dbRow, card: { about: 1 } },
      error: null,
    }));

    const result = await createSupabaseFeedStore(client).getOwnCard("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });

  it("maps a client error to STORE_ERROR", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));

    const result = await createSupabaseFeedStore(client).getOwnCard("p1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });
});

describe("createSupabaseFeedStore getCardByHandle", () => {
  it("resolves the handle through the profiles table", async () => {
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));

    const result = await createSupabaseFeedStore(client).getCardByHandle("ana");

    expect(result).toEqual({ ok: true, value: undefined });
    expect(calls.some((call) => call.table === "profiles")).toBe(true);
    expect(JSON.stringify(calls.map((call) => call.steps))).toContain("ana");
  });

  it("maps a client error to STORE_ERROR", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));

    const result = await createSupabaseFeedStore(client).getCardByHandle("ana");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });
});

describe("createSupabaseFeedStore match", () => {
  it("calls match_feed with the serialized vector, k and the excluded profile", async () => {
    const { client, rpcCalls } = fakeClient(() => ({ data: [], error: null }));

    await createSupabaseFeedStore(client).match([1, 0], 5, "p1");

    expect(rpcCalls).toEqual([["match_feed", { query: "[1,0]", k: 5, exclude_profile: "p1" }]]);
  });

  it("sends a null exclusion when none is given", async () => {
    const { client, rpcCalls } = fakeClient(() => ({ data: [], error: null }));

    await createSupabaseFeedStore(client).match([1, 0], 5);

    expect(rpcCalls).toEqual([["match_feed", { query: "[1,0]", k: 5, exclude_profile: null }]]);
  });

  it("returns the parsed hits", async () => {
    const hits = [hit("ana"), hit("ben")];
    const { client } = fakeClient(() => ({ data: hits, error: null }));

    const result = await createSupabaseFeedStore(client).match([1, 0], 5);

    expect(result).toEqual({ ok: true, value: hits });
  });

  it("returns STORE_ERROR when a row is malformed", async () => {
    const { client } = fakeClient(() => ({ data: [{ id: 1 }], error: null }));

    const result = await createSupabaseFeedStore(client).match([1, 0], 5);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });

  it("maps a client error to STORE_ERROR", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "boom" } }));

    const result = await createSupabaseFeedStore(client).match([1, 0], 5);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("STORE_ERROR");
  });
});
