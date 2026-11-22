import { Button } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedService } from "./feed-service.ts";
import { useQuery } from "../async/use-query.ts";
import { PeopleMap } from "./PeopleMap.tsx";
import { PEOPLE_MAP_MESSAGES as COPY } from "./people-map-messages.ts";

const SEARCH_DELAY_MS = 200;

/** The people that match the hub search (ADR 0022 §3); nothing for an empty search. */
export function PeopleSection({
  text,
  browse = false,
}: {
  readonly text: string;
  readonly browse?: boolean;
}) {
  const feed = useOptionalFeed();
  const [isMapOpen, setMapOpen] = useState(false);
  const query = text.trim();
  if (feed === undefined || (query === "" && !browse)) return null;
  const load = feed.mapPeople;
  const toggleMap = () => {
    setMapOpen((open) => !open);
  };
  if (isMapOpen && load !== undefined) {
    return (
      <section className="web-hub-for-you" aria-label={COPY.title}>
        <h2>{COPY.title}</h2>
        <Button size="sm" onClick={toggleMap}>
          {query ? COPY.list : COPY.close}
        </Button>
        <MapResults key={query} load={load} query={query} />
      </section>
    );
  }
  const mapAction =
    load === undefined ? undefined : (
      <Button size="sm" onClick={toggleMap}>
        {query ? COPY.open : COPY.explore}
      </Button>
    );
  if (query === "") return mapAction ?? null;
  return <PeopleResults key={query} feed={feed} query={query} mapAction={mapAction} />;
}

function PeopleResults({
  feed,
  query,
  mapAction,
}: {
  readonly feed: FeedService;
  readonly query: string;
  readonly mapAction?: React.ReactNode;
}) {
  const heading = useId();
  const search = useCallback(() => feed.search(query), [feed, query]);
  const people = useQuery(search, SEARCH_DELAY_MS);
  if (people.status !== "ready") return null;
  const profiles = people.value.filter((hit) => hit.kind === "profile");
  if (profiles.length === 0) return null;
  return (
    <section className="web-hub-for-you">
      <h2 id={heading}>{MESSAGES.feed.people}</h2>
      {mapAction}
      <ul className="web-feed-people" aria-labelledby={heading}>
        {profiles.map((hit) => (
          <li key={hit.id}>
            <RouteLink route={{ page: "profile", handle: hit.id }}>{hit.title}</RouteLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MapResults({
  load,
  query,
}: {
  readonly load: NonNullable<FeedService["mapPeople"]>;
  readonly query: string;
}) {
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
