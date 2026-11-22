import { useCallback, useId } from "react";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedService } from "./feed-service.ts";
import { useQuery } from "../async/use-query.ts";

const SEARCH_DELAY_MS = 200;

/** The people that match the hub search (ADR 0022 §3); nothing for an empty search. */
export function PeopleSection({ text }: { readonly text: string }) {
  const feed = useOptionalFeed();
  const query = text.trim();
  if (feed === undefined || query === "") return null;
  return <PeopleResults key={query} feed={feed} query={query} />;
}

function PeopleResults({ feed, query }: { readonly feed: FeedService; readonly query: string }) {
  const heading = useId();
  const search = useCallback(() => feed.search(query), [feed, query]);
  const people = useQuery(search, SEARCH_DELAY_MS);
  if (people.status !== "ready") return null;
  const profiles = people.value.filter((hit) => hit.kind === "profile");
  if (profiles.length === 0) return null;
  return (
    <section className="web-hub-for-you">
      <h2 id={heading}>{MESSAGES.feed.people}</h2>
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
