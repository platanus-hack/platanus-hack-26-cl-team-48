import { parseProfileCard, type FeedHit, type ProfileCard } from "@nodomics/profile";
import { Button } from "@nodomics/ui";
import { useId } from "react";
import { Avatar } from "../hub/Avatar.tsx";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";

const VISIBLE_DOMAINS = 3;
const VISIBLE_ENTRIES = 2;
const ENTRY_SEPARATOR = ", ";

/** A recommended person: who they are and why they complement you. */
export function PersonHitCard({ hit }: { readonly hit: FeedHit }) {
  const name = useId();
  const card = parseProfileCard(hit.payload);
  return (
    <article className="web-hub-person" aria-labelledby={name}>
      <header className="web-hub-person-head">
        <Avatar name={hit.title} size="md" />
        <h4 id={name} className="web-hub-person-name">
          <RouteLink route={{ page: "profile", handle: hit.id }}>{hit.title}</RouteLink>
        </h4>
      </header>
      {card.ok && <PersonReasons card={card.value} />}
    </article>
  );
}

function PersonReasons({ card }: { readonly card: ProfileCard }) {
  return (
    <>
      <span className="web-feed-pill web-hub-person-level">
        {MESSAGES.feed.card.technical[card.technical]}
      </span>
      {card.domains.length > 0 && (
        <ul className="web-hub-tags web-hub-person-domains">
          {card.domains.slice(0, VISIBLE_DOMAINS).map((domain) => (
            <li key={domain.name} className="web-hub-tag">
              {domain.name}
            </li>
          ))}
        </ul>
      )}
      {card.offers.length > 0 && (
        <p className="web-hub-person-reason">{MESSAGES.feed.canHelp(firstEntries(card.offers))}</p>
      )}
      {card.seeks.length > 0 && (
        <p className="web-hub-person-reason">{MESSAGES.feed.isSeeking(firstEntries(card.seeks))}</p>
      )}
    </>
  );
}

/** A recommended node or flow; the feed knows it by its card, so it is found in the hub by name. */
export function ComponentHitCard({
  hit,
  onSearch,
}: {
  readonly hit: FeedHit;
  readonly onSearch: (text: string) => void;
}) {
  const title = useId();
  const summary = summaryOf(hit.payload);
  return (
    <article className="web-hub-component" data-kind={hit.kind} aria-labelledby={title}>
      <span className="web-kind-tag" data-kind={hit.kind}>
        {MESSAGES.feed.kindLabel[hit.kind]}
      </span>
      <h4 id={title} className="web-hub-component-title">
        {hit.title}
      </h4>
      {summary !== undefined && <p className="web-hub-card-desc">{summary}</p>}
      <Button
        size="sm"
        icon="search"
        onClick={() => {
          onSearch(hit.title);
        }}
      >
        {MESSAGES.feed.searchFor(hit.title)}
      </Button>
    </article>
  );
}

const firstEntries = (entries: ReadonlyArray<string>) =>
  entries.slice(0, VISIBLE_ENTRIES).join(ENTRY_SEPARATOR);

/** The `summary` of a component card, the only field shown; anything else in the payload is ignored. */
const summaryOf = (payload: unknown): string | undefined => {
  if (typeof payload !== "object" || payload === null || !("summary" in payload)) return undefined;
  return typeof payload.summary === "string" && payload.summary.trim() !== ""
    ? payload.summary
    : undefined;
};
