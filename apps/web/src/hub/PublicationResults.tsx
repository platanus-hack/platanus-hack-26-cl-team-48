import type { HubError, PublicationSummary } from "@nodomics/hub";
import { Notice } from "@nodomics/ui";
import { useCallback, useId } from "react";
import { useQuery, type Query } from "../async/use-query.ts";
import { MESSAGES } from "../messages.ts";
import { useHub } from "./hub-context.ts";
import { ALL_KINDS, withTags, type KindFilter } from "./hub-filters.ts";
import { PublicationCard, PublicationList } from "./PublicationCard.tsx";

const SEARCH_DELAY_MS = 200;
const NO_TAGS: ReadonlySet<string> = new Set();

export type Listed = Query<ReadonlyArray<PublicationSummary>, HubError>;

/** The hub's published listing for a text, after a short pause while one types. */
export function useSearch(text: string, kind: KindFilter = ALL_KINDS) {
  const hub = useHub();
  const search = useCallback(
    () => hub.search({ text: text.trim(), ...(kind === ALL_KINDS ? {} : { kind }) }),
    [hub, text, kind],
  );
  return useQuery(search, SEARCH_DELAY_MS);
}

/** A titled list of publication cards, narrowed by the pressed tags. */
export function PublicationsSection({
  heading,
  listed,
  pressedTags = NO_TAGS,
}: {
  readonly heading: string;
  readonly listed: Listed;
  readonly pressedTags?: ReadonlySet<string>;
}) {
  const headingId = useId();
  return (
    <section className="web-hub-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <SectionBody listed={listed} pressedTags={pressedTags} />
    </section>
  );
}

function SectionBody({
  listed,
  pressedTags,
}: {
  readonly listed: Listed;
  readonly pressedTags: ReadonlySet<string>;
}) {
  if (listed.status === "failed") return <Notice tone="error" title={MESSAGES.hub.failed} />;
  if (listed.status === "loading") return null;
  return (
    <PublicationList
      publications={withTags(listed.value, pressedTags)}
      empty={MESSAGES.hub.noResults}
    />
  );
}

/** What matches a typed search, for a page that only lists once someone types. */
export function SearchResults({ text }: { readonly text: string }) {
  return <PublicationsSection heading={MESSAGES.hub.results} listed={useSearch(text)} />;
}

const RECENT_COUNT = 3;

/** The newest publications, shown without searching; nothing while loading, failed or empty. */
export function RecentPublications() {
  const listed = useSearch("");
  if (listed.status !== "ready" || listed.value.length === 0) return null;
  return (
    <section className="web-hub-grid" aria-label={MESSAGES.hub.recent}>
      {listed.value.slice(0, RECENT_COUNT).map((publication) => (
        <PublicationCard
          key={`${publication.owner.handle}/${publication.slug}`}
          publication={publication}
        />
      ))}
    </section>
  );
}
