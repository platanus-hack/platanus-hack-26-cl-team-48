import { profileToEmbeddingTexts } from "@nodomics/profile";
import { err } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { contentHashOf } from "../src/feed/content-hash.ts";
import {
  FEED_EMBEDDING_MODEL,
  findMatches,
  saveProfile,
  searchFeed,
  type FeedServiceDeps,
} from "../src/feed/feed-service.ts";
import type { StoredProfileCard } from "../src/feed/feed-store-port.ts";
import {
  EMBED_FAILURE,
  fakeEmbeddings,
  fakeStore,
  hit,
  STORE_FAILURE,
  validCard,
  type FakeStoreOptions,
} from "./feed-fixtures.ts";

const PROFILE_ID = "p1";

function setup(options: FakeStoreOptions = {}, failEmbeddings = false) {
  const store = fakeStore(options);
  const documentEmbeddings = fakeEmbeddings(failEmbeddings ? () => err(EMBED_FAILURE) : undefined);
  const queryEmbeddings = fakeEmbeddings(failEmbeddings ? () => err(EMBED_FAILURE) : undefined);
  const deps: FeedServiceDeps = { store, documentEmbeddings, queryEmbeddings };
  return { deps, store, documentEmbeddings, queryEmbeddings };
}

const embeddedTexts = (calls: readonly (readonly string[])[]): string[] => calls.flat();

function stored(card = validCard()): StoredProfileCard {
  const texts = profileToEmbeddingTexts(card);
  return {
    profileId: PROFILE_ID,
    card,
    offersEmbedding: [9, 9],
    seeksEmbedding: [8, 8],
    contentHash: contentHashOf({ model: FEED_EMBEDDING_MODEL, texts }),
    embeddingModel: FEED_EMBEDDING_MODEL,
  };
}

describe("saveProfile", () => {
  it("uses voyage-4 as the embedding model", () => {
    const model = FEED_EMBEDDING_MODEL;

    expect(model).toBe("voyage-4");
  });

  it("rejects an invalid card with its issues and touches nothing", async () => {
    const { deps, store, documentEmbeddings } = setup();

    const result = await saveProfile(deps, PROFILE_ID, { about: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CARD");
      if (result.error.code === "INVALID_CARD") {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    }
    expect(documentEmbeddings.calls).toEqual([]);
    expect(store.upserts).toEqual([]);
  });

  it("embeds the offers and seeks texts with the document embeddings", async () => {
    const card = validCard();
    const texts = profileToEmbeddingTexts(card);
    const { deps, documentEmbeddings } = setup();

    await saveProfile(deps, PROFILE_ID, card);

    expect(embeddedTexts(documentEmbeddings.calls).sort()).toEqual(
      [texts.offers, texts.seeks as string].sort(),
    );
  });

  it("never embeds with the query embeddings", async () => {
    const { deps, queryEmbeddings } = setup();

    await saveProfile(deps, PROFILE_ID, validCard());

    expect(queryEmbeddings.calls).toEqual([]);
  });

  it("upserts a row with both vectors, the model and the content hash", async () => {
    const card = validCard();
    const texts = profileToEmbeddingTexts(card);
    const { deps, store } = setup();

    const result = await saveProfile(deps, PROFILE_ID, card);

    expect(result).toEqual({ ok: true, value: card });
    expect(store.upserts).toHaveLength(1);
    const row = store.upserts[0];
    expect(row?.profileId).toBe(PROFILE_ID);
    expect(row?.card).toEqual(card);
    expect(row?.offersEmbedding).toHaveLength(2);
    expect(row?.seeksEmbedding).toHaveLength(2);
    expect(row?.embeddingModel).toBe("voyage-4");
    expect(row?.contentHash).toBe(contentHashOf({ model: "voyage-4", texts }));
  });

  it("stores the vector of each text in its own column", async () => {
    const card = validCard();
    const texts = profileToEmbeddingTexts(card);
    const store = fakeStore();
    const documentEmbeddings = fakeEmbeddings((inputs) => ({
      ok: true,
      value: inputs.map((text) => (text === texts.offers ? [1, 0] : [0, 1])),
    }));
    const deps: FeedServiceDeps = {
      store,
      documentEmbeddings,
      queryEmbeddings: fakeEmbeddings(),
    };

    await saveProfile(deps, PROFILE_ID, card);

    expect(store.upserts[0]?.offersEmbedding).toEqual([1, 0]);
    expect(store.upserts[0]?.seeksEmbedding).toEqual([0, 1]);
  });

  it("embeds only the offers and leaves the seeks vector undefined without seeks", async () => {
    const card = validCard({ seeks: [] });
    const texts = profileToEmbeddingTexts(card);
    const { deps, store, documentEmbeddings } = setup();

    await saveProfile(deps, PROFILE_ID, card);

    expect(embeddedTexts(documentEmbeddings.calls)).toEqual([texts.offers]);
    expect(store.upserts[0]?.seeksEmbedding).toBeUndefined();
  });

  it("skips embedding and reuses the stored vectors when the content is unchanged", async () => {
    const previous = stored();
    const updated = validCard({ links: { github: "https://github.com/someone" } });
    const { deps, store, documentEmbeddings } = setup({ own: previous });

    const result = await saveProfile(deps, PROFILE_ID, updated);

    expect(result).toEqual({ ok: true, value: updated });
    expect(documentEmbeddings.calls).toEqual([]);
    expect(store.upserts).toHaveLength(1);
    expect(store.upserts[0]?.card).toEqual(updated);
    expect(store.upserts[0]?.offersEmbedding).toEqual([9, 9]);
    expect(store.upserts[0]?.seeksEmbedding).toEqual([8, 8]);
    expect(store.upserts[0]?.contentHash).toBe(previous.contentHash);
  });

  it("embeds again when the stored row used another model", async () => {
    const previous = { ...stored(), embeddingModel: "voyage-3.5" };
    const { deps, documentEmbeddings } = setup({ own: previous });

    await saveProfile(deps, PROFILE_ID, validCard());

    expect(documentEmbeddings.calls.length).toBeGreaterThan(0);
  });

  it("embeds again when the offers text changed", async () => {
    const previous = stored();
    const { deps, documentEmbeddings } = setup({ own: previous });

    await saveProfile(deps, PROFILE_ID, validCard({ offers: ["something new"] }));

    expect(documentEmbeddings.calls.length).toBeGreaterThan(0);
  });

  it("returns EMBEDDINGS_UNAVAILABLE and upserts nothing when embedding fails", async () => {
    const { deps, store } = setup({}, true);

    const result = await saveProfile(deps, PROFILE_ID, validCard());

    expect(result).toEqual({ ok: false, error: { code: "EMBEDDINGS_UNAVAILABLE" } });
    expect(store.upserts).toEqual([]);
  });

  it("returns STORE_UNAVAILABLE when the store fails", async () => {
    const { deps } = setup({ failWith: STORE_FAILURE });

    const result = await saveProfile(deps, PROFILE_ID, validCard());

    expect(result).toEqual({ ok: false, error: { code: "STORE_UNAVAILABLE" } });
  });
});

describe("searchFeed", () => {
  it("embeds the query with the query embeddings and matches without exclusion", async () => {
    const hits = [hit("ana")];
    const { deps, store, queryEmbeddings, documentEmbeddings } = setup({ hits });

    const result = await searchFeed(deps, "epidemiology", 5);

    expect(result).toEqual({ ok: true, value: hits });
    expect(queryEmbeddings.calls).toEqual([["epidemiology"]]);
    expect(documentEmbeddings.calls).toEqual([]);
    expect(store.matchCalls).toEqual([{ query: [1, 0], k: 5, exclude: undefined }]);
  });

  it("returns EMBEDDINGS_UNAVAILABLE when embedding fails", async () => {
    const { deps, store } = setup({}, true);

    const result = await searchFeed(deps, "q", 5);

    expect(result).toEqual({ ok: false, error: { code: "EMBEDDINGS_UNAVAILABLE" } });
    expect(store.matchCalls).toEqual([]);
  });

  it("returns STORE_UNAVAILABLE when the store fails", async () => {
    const { deps } = setup({ failWith: STORE_FAILURE });

    const result = await searchFeed(deps, "q", 5);

    expect(result).toEqual({ ok: false, error: { code: "STORE_UNAVAILABLE" } });
  });
});

describe("findMatches", () => {
  it("matches the seeks vector excluding the own profile and embeds nothing", async () => {
    const hits = [hit("ben")];
    const { deps, store, documentEmbeddings, queryEmbeddings } = setup({
      own: stored(),
      hits,
    });

    const result = await findMatches(deps, PROFILE_ID, 7);

    expect(result).toEqual({ ok: true, value: hits });
    expect(store.ownCardReads).toEqual([PROFILE_ID]);
    expect(store.matchCalls).toEqual([{ query: [8, 8], k: 7, exclude: PROFILE_ID }]);
    expect(documentEmbeddings.calls).toEqual([]);
    expect(queryEmbeddings.calls).toEqual([]);
  });

  it("returns NO_PROFILE when the user has no card", async () => {
    const { deps, store } = setup();

    const result = await findMatches(deps, PROFILE_ID, 7);

    expect(result).toEqual({ ok: false, error: { code: "NO_PROFILE" } });
    expect(store.matchCalls).toEqual([]);
  });

  it("returns an empty list without matching when the card has no seeks", async () => {
    const card = validCard({ seeks: [] });
    const own: StoredProfileCard = { ...stored(card), seeksEmbedding: undefined };
    const { deps, store } = setup({ own });

    const result = await findMatches(deps, PROFILE_ID, 7);

    expect(result).toEqual({ ok: true, value: [] });
    expect(store.matchCalls).toEqual([]);
  });

  it("returns STORE_UNAVAILABLE when the store fails", async () => {
    const { deps } = setup({ failWith: STORE_FAILURE });

    const result = await findMatches(deps, PROFILE_ID, 7);

    expect(result).toEqual({ ok: false, error: { code: "STORE_UNAVAILABLE" } });
  });
});
