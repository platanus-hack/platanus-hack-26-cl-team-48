import { ok, type Result } from "@nodomics/protocol";
import type { FeedHit, ProfileCard } from "@nodomics/profile";
import type { EmbeddingsPort, EmbedError } from "../src/memory/embeddings.ts";
import type {
  FeedStoreError,
  FeedStorePort,
  StoredProfileCard,
} from "../src/feed/feed-store-port.ts";

export function validCard(overrides: Partial<ProfileCard> = {}): ProfileCard {
  return {
    schemaVersion: 1,
    about: "Veterinarian studying livestock outbreaks.",
    technical: "uses",
    domains: [{ name: "epidemiology", depth: "expert" }],
    offers: ["contagion models"],
    seeks: ["someone to automate my analyses"],
    links: {},
    ...overrides,
  };
}

export type FakeEmbeddings = EmbeddingsPort & { readonly calls: (readonly string[])[] };

export function fakeEmbeddings(
  respond: (texts: readonly string[]) => Result<number[][], EmbedError> = (texts) =>
    ok(texts.map((_text, index) => [index + 1, 0])),
): FakeEmbeddings {
  const calls: (readonly string[])[] = [];
  return {
    calls,
    embed: (texts) => {
      calls.push(texts);
      return Promise.resolve(respond(texts));
    },
  };
}

export type FakeStore = FeedStorePort & {
  readonly upserts: StoredProfileCard[];
  readonly matchCalls: { query: readonly number[]; k: number; exclude: string | undefined }[];
  readonly ownCardReads: string[];
};

export type FakeStoreOptions = {
  readonly own?: StoredProfileCard;
  readonly byHandle?: ProfileCard;
  readonly hits?: FeedHit[];
  readonly failWith?: FeedStoreError;
};

export function fakeStore(options: FakeStoreOptions = {}): FakeStore {
  const upserts: StoredProfileCard[] = [];
  const matchCalls: FakeStore["matchCalls"] = [];
  const ownCardReads: string[] = [];
  const reply = <T>(value: T): Result<T, FeedStoreError> =>
    options.failWith ? { ok: false, error: options.failWith } : ok(value);
  return {
    upserts,
    matchCalls,
    ownCardReads,
    getOwnCard: (profileId) => {
      ownCardReads.push(profileId);
      return Promise.resolve(reply(options.own));
    },
    getCardByHandle: () => Promise.resolve(reply(options.byHandle)),
    upsertCard: (row) => {
      if (!options.failWith) upserts.push(row);
      return Promise.resolve(reply(undefined));
    },
    match: (query, k, exclude) => {
      matchCalls.push({ query, k, exclude });
      return Promise.resolve(reply(options.hits ?? []));
    },
  };
}

export const STORE_FAILURE: FeedStoreError = { code: "STORE_ERROR", message: "down" };
export const EMBED_FAILURE: EmbedError = { code: "NETWORK", message: "down" };

export function hit(id: string): FeedHit {
  return { kind: "profile", id, title: id, payload: validCard(), similarity: 0.9 };
}
