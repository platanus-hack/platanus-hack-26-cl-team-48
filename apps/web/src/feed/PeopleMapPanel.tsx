import { useCallback } from "react";
import { useQuery } from "../async/use-query.ts";
import type { FeedService } from "./feed-service.ts";
import { PeopleMap } from "./PeopleMap.tsx";
import { PEOPLE_MAP_MESSAGES as COPY } from "./people-map-messages.ts";

const SEARCH_DELAY_MS = 200;

/** Loads the people map for the hub search and shows it, or why it cannot. */
export function PeopleMapPanel({
  load,
  text,
}: {
  readonly load: NonNullable<FeedService["mapPeople"]>;
  readonly text: string;
}) {
  const query = text.trim();
  const ask = useCallback(() => load(query), [load, query]);
  const people = useQuery(ask, SEARCH_DELAY_MS);
  if (people.status === "loading") return <p role="status">{COPY.loading}</p>;
  if (people.status === "failed") {
    return (
      <p role="status">
        {people.error.code === "UNAUTHENTICATED" ? COPY.signIn : COPY.unavailable}
      </p>
    );
  }
  return <PeopleMap people={people.value} filtered={query !== ""} />;
}
