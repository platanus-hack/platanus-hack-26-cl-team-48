import type { HubError, PublicationSummary } from "@nodomics/hub";
import { ok } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { ForYouSection } from "../feed/ForYouSection.tsx";
import { PeopleSection } from "../feed/PeopleSection.tsx";
import { MESSAGES } from "../messages.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import {
  ALL_KINDS,
  matching,
  offeredTags,
  toggled,
  withTags,
  type KindFilter,
} from "./hub-filters.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { useQuery, type Query } from "../async/use-query.ts";

const SEARCH_DELAY_MS = 200;
const SIGNED_OUT = "signed-out";
type Listed = Query<ReadonlyArray<PublicationSummary>, HubError> | typeof SIGNED_OUT;

const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

/** Everything published (ADR 0018, `/hub`), filtered by the text typed in the hub's header. */
export function HubPage({ text }: { readonly text: string }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const listed = useListed(filters, text);
  const change = (patch: (current: HubFilterState) => Partial<HubFilterState>) => {
    setFilters((current) => ({ ...current, ...patch(current) }));
  };
  return (
    <div className="web-hub-browse">
      <HubFilters
        filters={filters}
        tags={offeredTags(
          listed !== SIGNED_OUT && listed.status === "ready" ? listed.value : [],
          filters.pressedTags,
        )}
        onView={(view) => {
          change(() => ({ view }));
        }}
        onKind={(kind) => {
          change(() => ({ kind }));
        }}
        onTag={(tag) => {
          change((current) => ({ pressedTags: toggled(current.pressedTags, tag) }));
        }}
      />
      <main className="web-hub-page">
        <h1 className="web-visually-hidden">{MESSAGES.hub.title}</h1>
        {filters.view === "for-you" && <ForYouSection />}
        <PeopleSection text={text} />
        <PublicationsSection
          heading={listHeading(filters, text)}
          listed={listed}
          pressedTags={filters.pressedTags}
        />
      </main>
    </div>
  );
}

function PublicationsSection(props: {
  readonly heading: string;
  readonly listed: Listed;
  readonly pressedTags: ReadonlySet<string>;
}) {
  const heading = useId();
  return (
    <section className="web-hub-section" aria-labelledby={heading}>
      <h2 id={heading}>{props.heading}</h2>
      <SectionBody {...props} />
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
  if (listed === SIGNED_OUT) return <p className="web-panel-hint">{MESSAGES.hub.signInForMine}</p>;
  if (listed.status === "failed") return <Notice tone="error" title={MESSAGES.hub.failed} />;
  if (listed.status === "loading") return null;
  return (
    <PublicationList
      publications={withTags(listed.value, pressedTags)}
      empty={MESSAGES.hub.noResults}
    />
  );
}

const listHeading = ({ view }: HubFilterState, text: string) => {
  if (view === "mine") return MESSAGES.hub.views.mine;
  return text.trim() === "" ? MESSAGES.hub.views.recent : MESSAGES.hub.results;
};

/** What the chosen view lists before the tags narrow it. */
function useListed(filters: HubFilterState, text: string): Listed {
  const handle = useHubProfile()?.handle;
  const isMine = filters.view === "mine";
  const searched = useSearch(text, filters.kind);
  const mine = useOwnPublications(isMine ? handle : undefined);
  if (!isMine) return searched;
  if (handle === undefined) return SIGNED_OUT;
  return mine.status === "ready"
    ? { status: "ready", value: matching(mine.value, { text, kind: filters.kind }) }
    : mine;
}

function useSearch(text: string, kind: KindFilter) {
  const hub = useHub();
  const search = useCallback(
    () => hub.search({ text: text.trim(), ...(kind === ALL_KINDS ? {} : { kind }) }),
    [hub, text, kind],
  );
  return useQuery(search, SEARCH_DELAY_MS);
}

/** Asks the hub only for someone's publications: none while signed out or in another view. */
function useOwnPublications(handle: string | undefined) {
  const hub = useHub();
  const ask = useCallback(
    () => (handle === undefined ? Promise.resolve(ok([])) : hub.publicationsOf(handle)),
    [hub, handle],
  );
  return useQuery(ask);
}
