import type { HubError, PublicationSummary } from "@nodomics/hub";
import { ok, type Flow } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
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
import { PublicationList } from "./PublicationCard.tsx";
import { MyFlowsSection } from "./MyFlowsSection.tsx";
import type { EditorOpening } from "../routing/routes.ts";
import { useQuery, type Query } from "../async/use-query.ts";

const SEARCH_DELAY_MS = 200;
type Listed = Query<ReadonlyArray<PublicationSummary>, HubError>;

const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

type HubPageProps = {
  readonly text: string;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** The home page (ADR 0018, 0024): what is published, and the account's own flows. */
export function HubPage({ text, onOpenEditor }: HubPageProps) {
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
        {filters.view === "for-you" && <ForYouSection />}
        {filters.view === "flows" ? (
          <MyFlowsSection onOpenEditor={onOpenEditor} />
        ) : (
          <>
            <PeopleSection text={text} />
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
