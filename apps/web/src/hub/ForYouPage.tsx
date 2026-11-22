import { Input } from "@nodomics/ui";
import { useState } from "react";
import { useOptionalFeed } from "../feed/feed-context.ts";
import { ForYouSection } from "../feed/ForYouSection.tsx";
import { MESSAGES } from "../messages.ts";
import { FeaturedTrip } from "./FeaturedTrip.tsx";
import { Highlighted } from "./Highlighted.tsx";
import { BROWSE_VIEWS, offeredTags, toggled, ALL_KINDS } from "./hub-filters.ts";
import { HubFilters, type HubFilterState } from "./HubFilters.tsx";
import { HubLegend } from "./HubLegend.tsx";
import { NicheMapPage } from "./NicheMapPage.tsx";
import { useHubProfile } from "./hub-context.ts";
import { PublicationsSection } from "./PublicationResults.tsx";
import { useListed } from "./use-hub-listing.ts";

const MAX_QUICK_TOPICS = 5;
const INITIAL_FILTERS: HubFilterState = {
  view: "for-you",
  kind: ALL_KINDS,
  pressedTags: new Set(),
};

type ForYouPageProps = {
  readonly text: string;
  readonly onSearch: (text: string) => void;
};

/** "Para ti": the side column to explore, then the hero, the featured trip and the publications. */
export function ForYouPage({ text, onSearch }: ForYouPageProps) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const handle = useHubProfile()?.handle;
  const mapPeople = useOptionalFeed()?.mapPeople;
  const listed = useListed({ filters, text, handle });
  const publications = listed.status === "ready" ? listed.value : [];
  const change = (patch: (current: HubFilterState) => Partial<HubFilterState>) => {
    setFilters((current) => ({ ...current, ...patch(current) }));
  };
  const onTag = (tag: string) => {
    change((current) => ({ pressedTags: toggled(current.pressedTags, tag) }));
  };
  return (
    <div className="web-hub-browse">
      <HubFilters
        filters={filters}
        views={BROWSE_VIEWS.filter((view) => view !== "map" || mapPeople !== undefined)}
        tags={offeredTags(publications, filters.pressedTags)}
        onView={(view) => {
          change(() => ({ view }));
        }}
        onKind={(kind) => {
          change(() => ({ kind }));
        }}
        onTag={onTag}
      />
      {filters.view === "map" && mapPeople !== undefined ? (
        <NicheMapPage load={mapPeople} text={text} onSearch={onSearch} />
      ) : (
        <main className="web-hub-page">
          <div className="web-hub-hero">
            <div className="web-hub-hero-main">
              <h1 className="web-hub-hero-title">
                <Highlighted text={MESSAGES.hub.heroTitle} emphasis={MESSAGES.hub.heroEmphasis} />
              </h1>
              <div className="web-hub-hero-search" role="search">
                <Input
                  type="text"
                  icon="search"
                  label={MESSAGES.hub.heroSearch}
                  placeholder={MESSAGES.hub.heroPlaceholder}
                  value={text}
                  onChange={onSearch}
                />
              </div>
              <QuickTopics
                tags={offeredTags(publications, new Set()).slice(0, MAX_QUICK_TOPICS)}
                pressed={filters.pressedTags}
                onTag={onTag}
              />
            </div>
            <FeaturedTrip publication={publications[0]} />
          </div>
          <HubLegend />
          {filters.view === "for-you" && !isSearching(text) && (
            <ForYouSection onSearch={onSearch} />
          )}
          <PublicationsSection
            heading={listHeading(filters, text)}
            listed={listed}
            pressedTags={filters.pressedTags}
          />
        </main>
      )}
    </div>
  );
}

const isSearching = (text: string) => text.trim() !== "";

const listHeading = ({ view }: HubFilterState, text: string) => {
  if (view === "mine") return MESSAGES.hub.views.mine;
  return isSearching(text) ? MESSAGES.hub.results : MESSAGES.hub.views.recent;
};

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
