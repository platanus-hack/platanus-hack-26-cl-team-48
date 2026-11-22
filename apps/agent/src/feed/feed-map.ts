import type { FeedMapPerson } from "@nodomics/profile";
import { err, ok } from "@nodomics/protocol";
import {
  FEED_EMBEDDING_MODEL,
  findMatches,
  searchFeed,
  type FeedServiceDeps,
} from "./feed-service.ts";

const SEARCH_LIMIT = 20;

export async function loadFeedMap(deps: FeedServiceDeps, profileId: string, query?: string) {
  const searched = query ? await searchFeed(deps, query, SEARCH_LIMIT) : undefined;
  if (searched && !searched.ok) return searched;
  const handles = searched?.value.filter(({ kind }) => kind === "profile").map(({ id }) => id);
  if (handles?.length === 0) return ok<FeedMapPerson[]>([]);
  const [people, matches] = await Promise.all([
    deps.store.mapProfiles(FEED_EMBEDDING_MODEL, handles),
    findMatches(deps, profileId, SEARCH_LIMIT),
  ]);
  if (!people.ok) return err({ code: "STORE_UNAVAILABLE" } as const);
  const matched = new Set(
    matches.ok ? matches.value.filter(({ kind }) => kind === "profile").map(({ id }) => id) : [],
  );
  return ok(people.value.map((person) => ({ ...person, match: matched.has(person.handle) })));
}
