import { parseProfileCard, type FeedHit, type ProfileCard } from "@nodomics/profile";
import { ok } from "@nodomics/protocol";
import { feedFailure } from "./feed-errors.ts";
import type { FeedService } from "./feed-service.ts";

export type MemoryFeedSeed = {
  readonly cards: Readonly<Record<string, ProfileCard>>;
  /** The handle of the signed-in person; without it the service behaves as signed out. */
  readonly ownHandle?: string;
  /** Asked on every call when `ownHandle` is absent, so the service follows the hub session. */
  readonly currentHandle?: () => Promise<string | undefined>;
};

type CardEntry = readonly [handle: string, card: ProfileCard];

const MEMORY_SIMILARITY = 1;

/** The Feed without the agent service: cards kept in memory and found by plain text. */
export function createMemoryFeedService(seed: MemoryFeedSeed): FeedService {
  const cards = new Map(Object.entries(seed.cards));
  const handleOfSession = async () => seed.ownHandle ?? (await seed.currentHandle?.());
  return {
    search: (text) => Promise.resolve(ok(profileHitsOf(cards, ([, card]) => mentions(card, text)))),
    matches: async () => {
      const ownHandle = await handleOfSession();
      if (ownHandle === undefined) return feedFailure("UNAUTHENTICATED");
      if (!cards.has(ownHandle)) return feedFailure("NO_PROFILE");
      return ok(profileHitsOf(cards, ([handle]) => handle !== ownHandle));
    },
    card: (handle) => Promise.resolve(ok(cards.get(handle))),
    saveProfile: async (card) => {
      const ownHandle = await handleOfSession();
      if (ownHandle === undefined) return feedFailure("UNAUTHENTICATED");
      const parsed = parseProfileCard(card);
      if (!parsed.ok) return feedFailure("INVALID_CARD", parsed.error);
      cards.set(ownHandle, parsed.value);
      return ok(parsed.value);
    },
    extractProfile: () => Promise.resolve(feedFailure("UNAVAILABLE")),
  };
}

function profileHitsOf(
  cards: ReadonlyMap<string, ProfileCard>,
  isWanted: (entry: CardEntry) => boolean,
): FeedHit[] {
  return [...cards].filter(isWanted).map(([handle, card]) => ({
    kind: "profile",
    id: handle,
    title: handle,
    payload: card,
    similarity: MEMORY_SIMILARITY,
  }));
}

function mentions(card: ProfileCard, text: string): boolean {
  const words = [
    card.about,
    ...card.domains.map(({ name }) => name),
    ...card.offers,
    ...card.seeks,
  ];
  return words.join("\n").toLowerCase().includes(text.toLowerCase());
}
