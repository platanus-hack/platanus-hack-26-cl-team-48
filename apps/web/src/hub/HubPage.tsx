import type { HubError, PublicationSummary } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { ForYouSection } from "../feed/ForYouSection.tsx";
import { PeopleSection } from "../feed/PeopleSection.tsx";
import { MESSAGES } from "../messages.ts";
import { useHub, useHubProfile } from "./hub-context.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import { HubHero } from "./HubHero.tsx";
import { HubTabs } from "./HubTabs.tsx";
import {
  ALL_KINDS,
  matching,
  offeredTags,
  toggled,
  withTags,
  type HubTab,
  type KindFilter,
} from "./hub-filters.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { MyFlowsSection } from "./MyFlowsSection.tsx";
import type { EditorOpening } from "../routing/routes.ts";
import { useQuery, type Query } from "../async/use-query.ts";

const SEARCH_DELAY_MS = 200;
type Listed = Query<ReadonlyArray<PublicationSummary>, HubError>;

const NO_TAGS: ReadonlySet<string> = new Set();
const INITIAL_FILTERS: HubFilterState = { kind: ALL_KINDS, pressedTags: NO_TAGS };

type HubPageProps = {
  readonly text: string;
  readonly onSearch: (text: string) => void;
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** The home page (ADR 0018, 0024): discover what is published, or work on the account's own. */
export function HubPage({ text, onSearch, onOpenEditor }: HubPageProps) {
  const [chosenTab, setTab] = useState<HubTab>("discover");
  const handle = useHubProfile()?.handle;
  // The account's space needs a session: signed out, the page goes back to discovering.
  const tab = handle === undefined ? "discover" : chosenTab;
  const ids = { panel: useId(), discover: useId(), workspace: useId() };
  return (
    <div className="web-hub-home">
      <h1 className="web-visually-hidden">{MESSAGES.hub.title}</h1>
      <HubTabs tab={tab} ids={ids} isSignedIn={handle !== undefined} onTab={setTab} />
      <div role="tabpanel" id={ids.panel} aria-labelledby={ids[tab]} className="web-hub-page">
        {handle === undefined || tab === "discover" ? (
          <DiscoverPanel text={text} onSearch={onSearch} isSignedIn={handle !== undefined} />
        ) : (
          <WorkspacePanel text={text} handle={handle} onOpenEditor={onOpenEditor} />
        )}
      </div>
    </div>
  );
}

function DiscoverPanel({
  text,
  onSearch,
  isSignedIn,
}: {
  readonly text: string;
  readonly onSearch: (text: string) => void;
  readonly isSignedIn: boolean;
}) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const listed = useSearch(text, filters.kind);
  const chooseKind = (kind: KindFilter) => {
    setFilters((current) => ({ ...current, kind }));
  };
  return (
    <>
      {isSignedIn ? <ForYouSection onSearch={onSearch} /> : <HubHero onKind={chooseKind} />}
      <HubFilters
        filters={filters}
        tags={offeredTags(listed.status === "ready" ? listed.value : [], filters.pressedTags)}
        onKind={chooseKind}
        onTag={(tag) => {
          setFilters((current) => ({ ...current, pressedTags: toggled(current.pressedTags, tag) }));
        }}
      />
      <PeopleSection text={text} browse />
      <PublicationsSection
        heading={text.trim() === "" ? MESSAGES.hub.recent : MESSAGES.hub.results}
        listed={listed}
        pressedTags={filters.pressedTags}
      />
    </>
  );
}

function WorkspacePanel({
  text,
  handle,
  onOpenEditor,
}: {
  readonly text: string;
  readonly handle: string;
  readonly onOpenEditor: (opening: EditorOpening) => void;
}) {
  const mine = useOwnPublications(handle);
  return (
    <>
      <MyFlowsSection onOpenEditor={onOpenEditor} />
      <PublicationsSection
        heading={MESSAGES.hub.mine}
        listed={
          mine.status === "ready"
            ? { status: "ready", value: matching(mine.value, { text, kind: ALL_KINDS }) }
            : mine
        }
        pressedTags={NO_TAGS}
      />
    </>
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

function useSearch(text: string, kind: KindFilter) {
  const hub = useHub();
  const search = useCallback(
    () => hub.search({ text: text.trim(), ...(kind === ALL_KINDS ? {} : { kind }) }),
    [hub, text, kind],
  );
  return useQuery(search, SEARCH_DELAY_MS);
}

function useOwnPublications(handle: string) {
  const hub = useHub();
  const ask = useCallback(() => hub.publicationsOf(handle), [hub, handle]);
  return useQuery(ask);
}
