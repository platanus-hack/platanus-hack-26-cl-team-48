import {
  parseProfileCard,
  profileToEmbeddingTexts,
  type FeedHit,
  type ProfileCard,
  type ProfileEmbeddingTexts,
} from "@nodomics/profile";
import { err, ok, type Result, type ValidationIssue } from "@nodomics/protocol";
import type { EmbeddingsPort } from "../memory/embeddings.ts";
import { contentHashOf } from "./content-hash.ts";
import type { FeedStorePort, StoredProfileCard } from "./feed-store-port.ts";

export const FEED_EMBEDDING_MODEL = "voyage-4";

export type FeedServiceDeps = {
  readonly store: FeedStorePort;
  readonly documentEmbeddings: EmbeddingsPort;
  readonly queryEmbeddings: EmbeddingsPort;
};

export type SaveProfileError =
  | { readonly code: "INVALID_CARD"; readonly issues: ValidationIssue[] }
  | { readonly code: "EMBEDDINGS_UNAVAILABLE" }
  | { readonly code: "STORE_UNAVAILABLE" };
export type SearchFeedError =
  { readonly code: "EMBEDDINGS_UNAVAILABLE" } | { readonly code: "STORE_UNAVAILABLE" };
export type FindMatchesError =
  { readonly code: "NO_PROFILE" } | { readonly code: "STORE_UNAVAILABLE" };

const STORE_UNAVAILABLE = err({ code: "STORE_UNAVAILABLE" } as const);
const EMBEDDINGS_UNAVAILABLE = err({ code: "EMBEDDINGS_UNAVAILABLE" } as const);

type Vectors = Pick<StoredProfileCard, "offersEmbedding" | "seeksEmbedding">;

export async function saveProfile(
  deps: FeedServiceDeps,
  profileId: string,
  candidate: unknown,
): Promise<Result<ProfileCard, SaveProfileError>> {
  const parsed = parseProfileCard(candidate);
  if (!parsed.ok) return err({ code: "INVALID_CARD", issues: parsed.error });
  const card = parsed.value;
  const texts = profileToEmbeddingTexts(card);
  const contentHash = contentHashOf({ model: FEED_EMBEDDING_MODEL, texts });
  const previous = await deps.store.getOwnCard(profileId);
  if (!previous.ok) return STORE_UNAVAILABLE;
  const vectors = isUpToDate(previous.value, contentHash)
    ? ok(previous.value)
    : await embedTexts(deps.documentEmbeddings, texts);
  if (!vectors.ok) return EMBEDDINGS_UNAVAILABLE;
  const row = { profileId, card, contentHash, embeddingModel: FEED_EMBEDDING_MODEL };
  const saved = await deps.store.upsertCard({ ...row, ...pickVectors(vectors.value) });
  return saved.ok ? ok(card) : STORE_UNAVAILABLE;
}

const isUpToDate = (
  stored: StoredProfileCard | undefined,
  contentHash: string,
): stored is StoredProfileCard =>
  stored?.contentHash === contentHash && stored.embeddingModel === FEED_EMBEDDING_MODEL;

const pickVectors = ({ offersEmbedding, seeksEmbedding }: Vectors): Vectors => ({
  offersEmbedding,
  seeksEmbedding,
});

async function embedTexts(
  embeddings: EmbeddingsPort,
  texts: ProfileEmbeddingTexts,
): Promise<Result<Vectors, null>> {
  const inputs = texts.seeks === undefined ? [texts.offers] : [texts.offers, texts.seeks];
  const embedded = await embeddings.embed(inputs);
  const [offersEmbedding, seeksEmbedding] = embedded.ok ? embedded.value : [];
  return offersEmbedding ? ok({ offersEmbedding, seeksEmbedding }) : err(null);
}

export async function searchFeed(
  deps: FeedServiceDeps,
  query: string,
  k: number,
): Promise<Result<FeedHit[], SearchFeedError>> {
  const embedded = await deps.queryEmbeddings.embed([query]);
  const vector = embedded.ok ? embedded.value[0] : undefined;
  if (!vector) return EMBEDDINGS_UNAVAILABLE;
  const hits = await deps.store.match(vector, k);
  return hits.ok ? hits : STORE_UNAVAILABLE;
}

export async function findMatches(
  deps: FeedServiceDeps,
  profileId: string,
  k: number,
): Promise<Result<FeedHit[], FindMatchesError>> {
  const own = await deps.store.getOwnCard(profileId);
  if (!own.ok) return STORE_UNAVAILABLE;
  if (!own.value) return err({ code: "NO_PROFILE" });
  if (!own.value.seeksEmbedding) return ok([]);
  const hits = await deps.store.match(own.value.seeksEmbedding, k, profileId);
  return hits.ok ? hits : STORE_UNAVAILABLE;
}
