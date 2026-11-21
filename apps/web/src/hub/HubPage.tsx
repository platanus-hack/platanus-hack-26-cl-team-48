import type { PublicationSummary } from "@nodomics/hub";
import { ok } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { MESSAGES } from "../messages.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import {
  ALL_KINDS,
  HUB_VIEWS,
  PUBLIC_VIEWS,
  matching,
  offeredTags,
  toggled,
  withTags,
  type KindFilter,
} from "./hub-filters.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { useHubQuery, type HubQuery } from "./use-hub-query.ts";

const SEARCH_DELAY_MS = 200;
type Listed = HubQuery<ReadonlyArray<PublicationSummary>>;

const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

/** Everything published (ADR 0018, `/hub`), filtered by the text typed in the hub's header. */
export function HubPage({ text }: { readonly text: string }) {
  const [chosen, setFilters] = useState(INITIAL_FILTERS);
  const handle = useHubProfile()?.handle;
  const filters = reachableFilters(chosen, handle !== undefined);
  const listed = useListed({ filters, text, handle });
  const change = (patch: (current: HubFilterState) => Partial<HubFilterState>) => {
    setFilters((current) => ({ ...current, ...patch(current) }));
  };
  return (
    <div className="web-hub-browse">
      <HubFilters
        filters={filters}
        views={handle === undefined ? PUBLIC_VIEWS : HUB_VIEWS}
        tags={offeredTags(listed.status === "ready" ? listed.value : [], filters.pressedTags)}
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

/** "Mis publicaciones" needs an account: signed out, it goes back to "Para ti". */
const reachableFilters = (filters: HubFilterState, isSignedIn: boolean): HubFilterState =>
  isSignedIn || filters.view !== "mine" ? filters : { ...filters, view: "for-you" };

/** What the chosen view lists before the tags narrow it. */
function useListed({
  filters,
  text,
  handle,
}: {
  readonly filters: HubFilterState;
  readonly text: string;
  readonly handle: string | undefined;
}): Listed {
  const isMine = filters.view === "mine";
  const searched = useSearch(text, filters.kind);
  const mine = useOwnPublications(isMine ? handle : undefined);
  if (!isMine) return searched;
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
  return useHubQuery(search, SEARCH_DELAY_MS);
}

/** Asks the hub only for someone's publications: none while signed out or in another view. */
function useOwnPublications(handle: string | undefined) {
  const hub = useHub();
  const ask = useCallback(
    () => (handle === undefined ? Promise.resolve(ok([])) : hub.publicationsOf(handle)),
    [hub, handle],
  );
  return useHubQuery(ask);
}
