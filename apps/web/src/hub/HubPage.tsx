import type { HubError, PublicationSummary } from "@nodomics/hub";
import { ok, type Flow } from "@nodomics/protocol";
import { Input, Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { ForYouSection } from "../feed/ForYouSection.tsx";
import { PeopleSection } from "../feed/PeopleSection.tsx";
import { MESSAGES } from "../messages.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import {
  ALL_KINDS,
  HUB_VIEWS,
  isAccountView,
  PUBLIC_VIEWS,
  matching,
  offeredTags,
  toggled,
  withTags,
  type KindFilter,
} from "./hub-filters.ts";
import { FeaturedTrip } from "./FeaturedTrip.tsx";
import { HubLegend } from "./HubLegend.tsx";
import { MyFlowsSection } from "./MyFlowsSection.tsx";
import { PublicationList } from "./PublicationCard.tsx";
import type { EditorOpening } from "../routing/routes.ts";
import { useQuery, type Query } from "../async/use-query.ts";

const SEARCH_DELAY_MS = 200;
type Listed = Query<ReadonlyArray<PublicationSummary>, HubError>;

const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

const MAX_QUICK_TOPICS = 5;
const ignoreSearch = () => undefined;

type HubPageProps = {
  readonly text: string;
  /** Shares the hero search with the hub bar; without it the hero box only shows the text. */
  readonly onSearch?: (text: string) => void;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** The home page (ADR 0018, 0024): what is published, and the account's own flows. */
export function HubPage({ text, onSearch, onOpenEditor }: HubPageProps) {
  const [chosen, setFilters] = useState(INITIAL_FILTERS);
  const handle = useHubProfile()?.handle;
  const filters = reachableFilters(chosen, handle !== undefined);
  const listed = useListed({ filters, text, handle });
  const publications = listed.status === "ready" ? listed.value : [];

  const change = (patch: (current: HubFilterState) => Partial<HubFilterState>) => {
    setFilters((current) => ({ ...current, ...patch(current) }));
  };

  return (
    <div className="web-hub-browse">
      <HubFilters
        filters={filters}
        views={handle === undefined ? PUBLIC_VIEWS : HUB_VIEWS}
        tags={offeredTags(publications, filters.pressedTags)}
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
        <div className="web-hub-hero">
          <div className="web-hub-hero-main">
            <h1 className="web-hub-hero-title">{MESSAGES.hub.heroTitle}</h1>
            <div className="web-hub-hero-search" role="search">
              <Input
                type="text"
                icon="search"
                label={MESSAGES.hub.heroSearch}
                placeholder={MESSAGES.hub.heroPlaceholder}
                value={text}
                onChange={onSearch ?? ignoreSearch}
              />
            </div>
            <QuickTopics
              tags={offeredTags(publications, new Set()).slice(0, MAX_QUICK_TOPICS)}
              pressed={filters.pressedTags}
              onTag={(tag) => {
                change((current) => ({ pressedTags: toggled(current.pressedTags, tag) }));
              }}
            />
          </div>
          <FeaturedTrip publication={publications[0]} />
        </div>

        <HubLegend />

        {filters.view === "for-you" && <ForYouSection />}
        {filters.view === "flows" ? (
          <MyFlowsSection onOpenEditor={onOpenEditor} />
        ) : (
          <>
            <PeopleSection text={text} browse={!isAccountView(filters.view)} />
            <PublicationsSection
              heading={listHeading(filters, text)}
              listed={listed}
              pressedTags={filters.pressedTags}
            />
          </>
        )}
      </main>
    </div>
  );
}

/** Shortcuts to the tags the listed publications really carry. */
function QuickTopics({
  tags,
  pressed,
  onTag,
}: {
  readonly tags: ReadonlyArray<string>;
  readonly pressed: ReadonlySet<string>;
  readonly onTag: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <nav className="web-hub-quick" aria-label={MESSAGES.hub.quickTopics}>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="web-hub-quick-link"
          aria-pressed={pressed.has(tag)}
          onClick={() => {
            onTag(tag);
          }}
        >
          {tag}
        </button>
      ))}
    </nav>
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

/** The account's views need a session: signed out, they go back to "Para ti". */
const reachableFilters = (filters: HubFilterState, isSignedIn: boolean): HubFilterState =>
  isSignedIn || !isAccountView(filters.view) ? filters : { ...filters, view: "for-you" };

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
