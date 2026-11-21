import type { PublicationSummary } from "@nodomics/hub";
import { Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import { ALL_KINDS, matching, tagsOf, toggled, withTags, type KindFilter } from "./hub-filters.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { useHubQuery, type HubQuery } from "./use-hub-query.ts";

const SEARCH_DELAY_MS = 200;
const SIGNED_OUT = "signed-out";
type Listed = HubQuery<ReadonlyArray<PublicationSummary>> | typeof SIGNED_OUT;

const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

/** Everything published (ADR 0018, `/hub`), filtered by the text typed in the hub's header. */
export function HubPage({ text }: { readonly text: string }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const listed = useListed(filters, text);
  const change = (patch: Partial<HubFilterState>) => {
    setFilters({ ...filters, ...patch });
  };
  return (
    <div className="web-hub-browse">
      <HubFilters
        filters={filters}
        tags={listed !== SIGNED_OUT && listed.status === "ready" ? tagsOf(listed.value) : []}
        onView={(view) => {
          change({ view });
        }}
        onKind={(kind) => {
          change({ kind });
        }}
        onTag={(tag) => {
          change({ pressedTags: toggled(filters.pressedTags, tag) });
        }}
      />
      <main className="web-hub-page">
        <h1 className="web-visually-hidden">{MESSAGES.hub.title}</h1>
        {filters.view === "for-you" && <ForYouMockup />}
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

function ForYouMockup() {
  const heading = useId();
  return (
    <section className="web-hub-for-you" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.hub.forYou}</h2>
      <p className="web-mockup-note">{MESSAGES.hub.forYouMockup}</p>
      <ul className="web-hub-for-you-list" aria-hidden="true">
        {MESSAGES.hub.forYouExamples.map((example) => (
          <li key={example.title} className="web-hub-for-you-card">
            <span className="web-hub-for-you-kind">{example.kind}</span>
            <strong>{example.title}</strong>
            <span className="web-hub-for-you-reason">{example.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What the chosen view lists before the tags narrow it. */
function useListed(filters: HubFilterState, text: string): Listed {
  const searched = useSearch(text, filters.kind);
  const mine = useMine(text, filters.kind);
  return filters.view === "mine" ? mine : searched;
}

function useSearch(text: string, kind: KindFilter) {
  const hub = useHub();
  const search = useCallback(
    () => hub.search({ text: text.trim(), ...(kind === ALL_KINDS ? {} : { kind }) }),
    [hub, text, kind],
  );
  return useHubQuery(search, SEARCH_DELAY_MS);
}

function useMine(text: string, kind: KindFilter): Listed {
  const hub = useHub();
  const handle = useHubProfile()?.handle;
  const ask = useCallback(() => hub.publicationsOf(handle ?? ""), [hub, handle]);
  const query = useHubQuery(ask);
  if (handle === undefined) return SIGNED_OUT;
  return query.status === "ready"
    ? { status: "ready", value: matching(query.value, { text, kind }) }
    : query;
}
