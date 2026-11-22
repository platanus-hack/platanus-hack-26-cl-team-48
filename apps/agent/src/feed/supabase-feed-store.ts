import { FeedHitSchema, parseProfileCard, type FeedHit, type ProfileCard } from "@nodomics/profile";
import { err, ok, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedStoreError, FeedStorePort, StoredProfileCard } from "./feed-store-port.ts";

type Outcome<T> = Result<T, FeedStoreError>;
type Reply = { readonly data: unknown; readonly error: { readonly message: string } | null };

const StoredRow = Type.Object({
  profile_id: Type.String(),
  card: Type.Unknown(),
  offers_embedding: Type.String(),
  seeks_embedding: Type.Union([Type.String(), Type.Null()]),
  content_hash: Type.String(),
  embedding_model: Type.String(),
});
const HandleRow = Type.Object({ profile_cards: Type.Unknown() });
const VectorSchema = Type.Array(Type.Number());

const storeError = (message: string): Outcome<never> => err({ code: "STORE_ERROR", message });
const malformed = (what: string): Outcome<never> => storeError(`Stored ${what} is malformed.`);

export function createSupabaseFeedStore(client: SupabaseClient): FeedStorePort {
  return {
    getOwnCard: (profileId) => getOwnCard(client, profileId),
    getCardByHandle: (handle) => getCardByHandle(client, handle),
    upsertCard: (row) => upsertCard(client, row),
    match: (query, k, exclude) => match(client, { query, k, exclude }),
  };
}

const serializeVector = (vector: readonly number[]): string => JSON.stringify(vector);

function parseVector(text: string): readonly number[] | undefined {
  try {
    const vector: unknown = JSON.parse(text);
    return Value.Check(VectorSchema, vector) ? vector : undefined;
  } catch {
    return undefined;
  }
}

async function upsertCard(client: SupabaseClient, row: StoredProfileCard): Promise<Outcome<void>> {
  const { error }: Reply = await client.from("profile_cards").upsert({
    profile_id: row.profileId,
    card: row.card,
    schema_version: row.card.schemaVersion,
    offers_embedding: serializeVector(row.offersEmbedding),
    seeks_embedding: row.seeksEmbedding ? serializeVector(row.seeksEmbedding) : null,
    content_hash: row.contentHash,
    embedding_model: row.embeddingModel,
  });
  return error ? storeError("Saving the profile card failed.") : ok(undefined);
}

async function getOwnCard(
  client: SupabaseClient,
  profileId: string,
): Promise<Outcome<StoredProfileCard | undefined>> {
  const query = client.from("profile_cards").select("*").eq("profile_id", profileId);
  const { data, error }: Reply = await query.maybeSingle();
  if (error) return storeError("Reading the profile card failed.");
  return data === null ? ok(undefined) : toStoredCard(data);
}

function toStoredCard(data: unknown): Outcome<StoredProfileCard> {
  if (!Value.Check(StoredRow, data)) return malformed("profile card");
  const card = parseProfileCard(data.card);
  const offersEmbedding = parseVector(data.offers_embedding);
  const seeksEmbedding = data.seeks_embedding ? parseVector(data.seeks_embedding) : undefined;
  if (!card.ok || !offersEmbedding || (data.seeks_embedding && !seeksEmbedding))
    return malformed("profile card");
  return ok({
    profileId: data.profile_id,
    card: card.value,
    offersEmbedding,
    seeksEmbedding,
    contentHash: data.content_hash,
    embeddingModel: data.embedding_model,
  });
}

async function getCardByHandle(
  client: SupabaseClient,
  handle: string,
): Promise<Outcome<ProfileCard | undefined>> {
  const query = client.from("profiles").select("profile_cards(card)").eq("handle", handle);
  const { data, error }: Reply = await query.maybeSingle();
  if (error) return storeError("Reading the profile card failed.");
  if (data === null || !Value.Check(HandleRow, data)) return ok(undefined);
  const embedded: unknown = data.profile_cards;
  const row: unknown = Array.isArray(embedded) ? embedded[0] : embedded;
  if (row === undefined || row === null) return ok(undefined);
  const card = typeof row === "object" && "card" in row ? parseProfileCard(row.card) : undefined;
  return card?.ok ? ok(card.value) : malformed("profile card");
}

type MatchInput = {
  readonly query: readonly number[];
  readonly k: number;
  readonly exclude: string | undefined;
};

async function match(client: SupabaseClient, input: MatchInput): Promise<Outcome<FeedHit[]>> {
  const reply: Reply = await client.rpc("match_feed", {
    query: serializeVector(input.query),
    k: input.k,
    exclude_profile: input.exclude ?? null,
  });
  if (reply.error) return storeError("Searching the feed failed.");
  const rows: unknown = reply.data;
  return Array.isArray(rows) && rows.every((row) => Value.Check(FeedHitSchema, row))
    ? ok(rows)
    : malformed("feed results");
}
