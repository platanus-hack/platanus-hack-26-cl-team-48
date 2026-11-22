import type { FeedMapPerson } from "@nodomics/profile";
import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { loadFeedMap } from "../src/feed/feed-map.ts";
import { FEED_EMBEDDING_MODEL, type FeedServiceDeps } from "../src/feed/feed-service.ts";
import type { FeedStorePort, StoredProfileCard } from "../src/feed/feed-store-port.ts";
import {
  EMBED_FAILURE,
  STORE_FAILURE,
  fakeEmbeddings,
  fakeStore,
  hit,
  validCard,
} from "./feed-fixtures.ts";

const PROFILE_ID = "p1";
const ADA = {
  handle: "ada",
  title: "Ada",
  technical: "uses",
  offers: ["contagion models"],
  vector: [0.5, 0.7],
} satisfies Omit<FeedMapPerson, "match">;
const GRACE = { ...ADA, handle: "grace", title: "Grace" };
const OWN_CARD: StoredProfileCard = {
  profileId: PROFILE_ID,
  card: validCard(),
  offersEmbedding: [0.9, 0.7],
  seeksEmbedding: [0.8, 0.5],
  contentHash: "hash",
  embeddingModel: FEED_EMBEDDING_MODEL,
};

function setup(
  options: Parameters<typeof fakeStore>[0] = {},
  mapReply: Awaited<ReturnType<FeedStorePort["mapProfiles"]>> = ok([ADA, GRACE]),
) {
  const store = fakeStore(options);
  const mapCalls: { model: string; handles: readonly string[] | undefined }[] = [];
  const deps: FeedServiceDeps = {
    store: {
      ...store,
      mapProfiles: (model, handles) => {
        mapCalls.push({ model, handles });
        return Promise.resolve(mapReply);
      },
    },
    documentEmbeddings: fakeEmbeddings(),
    queryEmbeddings: fakeEmbeddings(),
  };
  return { deps, mapCalls };
}

describe("loadFeedMap", () => {
  it("loads stored vectors without embedding a blank browse request", async () => {
    const { deps, mapCalls } = setup();
    const queryEmbeddings = fakeEmbeddings(() => err(EMBED_FAILURE));

    const result = await loadFeedMap({ ...deps, queryEmbeddings }, PROFILE_ID);

    expect(mapCalls).toEqual([{ model: FEED_EMBEDDING_MODEL, handles: undefined }]);
    expect(queryEmbeddings.calls).toEqual([]);
    expect(result).toEqual(
      ok([
        { ...ADA, match: false },
        { ...GRACE, match: false },
      ]),
    );
  });

  it("looks up coordinates only for profiles returned by the text search", async () => {
    const { deps, mapCalls } = setup(
      { hits: [hit("ada"), { ...hit("aggregate"), kind: "node" }] },
      ok([ADA]),
    );
    const queryEmbeddings = fakeEmbeddings();

    const result = await loadFeedMap({ ...deps, queryEmbeddings }, PROFILE_ID, "models");

    expect(queryEmbeddings.calls).toEqual([["models"]]);
    expect(mapCalls).toEqual([{ model: FEED_EMBEDDING_MODEL, handles: ["ada"] }]);
    expect(result).toEqual(ok([{ ...ADA, match: false }]));
  });

  it("marks personalized matches by handle", async () => {
    const { deps } = setup({
      own: OWN_CARD,
      hits: [hit("grace"), { ...hit("ada"), kind: "node" }],
    });

    const result = await loadFeedMap(deps, PROFILE_ID);

    expect(result).toEqual(
      ok([
        { ...ADA, match: false },
        { ...GRACE, match: true },
      ]),
    );
  });

  it("propagates a failure to load stored vectors", async () => {
    const { deps } = setup({}, err(STORE_FAILURE));

    const result = await loadFeedMap(deps, PROFILE_ID);

    expect(result.ok).toBe(false);
  });

  it("keeps the map available without matches when personalization fails", async () => {
    const { deps } = setup({ failWith: STORE_FAILURE });

    const result = await loadFeedMap(deps, PROFILE_ID);

    expect(result).toEqual(
      ok([
        { ...ADA, match: false },
        { ...GRACE, match: false },
      ]),
    );
  });

  it("propagates a query embedding failure", async () => {
    const { deps, mapCalls } = setup();
    const queryEmbeddings = fakeEmbeddings(() => err(EMBED_FAILURE));

    const result = await loadFeedMap({ ...deps, queryEmbeddings }, PROFILE_ID, "models");

    expect(result.ok).toBe(false);
    expect(mapCalls).toEqual([]);
  });
});
