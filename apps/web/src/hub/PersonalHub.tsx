import { Input } from "@nodomics/ui";
import { useState } from "react";
import { ForYouSection } from "../feed/ForYouSection.tsx";
import { PeopleSection } from "../feed/PeopleSection.tsx";
import { MESSAGES } from "../messages.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { FeaturedTrip } from "./FeaturedTrip.tsx";
import { offeredTags, toggled } from "./hub-filters.ts";
import { HubLegend } from "./HubLegend.tsx";
import type { HubTab } from "./HubTabs.tsx";
import { MyFlowsSection } from "./MyFlowsSection.tsx";
import { PublicationsSection, useSearch } from "./PublicationResults.tsx";

const MAX_QUICK_TOPICS = 5;

type PersonalHubProps = {
  readonly tab: HubTab;
  readonly text: string;
  readonly onSearch: (text: string) => void;
  readonly onOpenEditor: (opening: EditorOpening) => void;
};

/** The home page of someone signed in: "Para ti", their flows or the people. */
export function PersonalHub({ tab, text, onSearch, onOpenEditor }: PersonalHubProps) {
  if (tab === "flows") {
    return (
      <main className="web-hub-page">
        <h1 className="web-hub-tab-title">{MESSAGES.hub.tabs.flows}</h1>
        <MyFlowsSection onOpenEditor={onOpenEditor} />
      </main>
    );
  }
  if (tab === "people") {
    return (
      <main className="web-hub-page">
        <h1 className="web-hub-tab-title">{MESSAGES.hub.tabs.people}</h1>
        <div className="web-hub-hero-search" role="search">
          <Input
            type="text"
            icon="search"
            label={MESSAGES.hub.search}
            placeholder={MESSAGES.hub.searchPlaceholder}
            value={text}
            onChange={onSearch}
          />
        </div>
        <PeopleSection text={text} browse />
      </main>
    );
  }
  return <ForYouPage text={text} onSearch={onSearch} />;
}

function ForYouPage({
  text,
  onSearch,
}: {
  readonly text: string;
  readonly onSearch: (text: string) => void;
}) {
  const [pressedTags, setPressed] = useState<ReadonlySet<string>>(new Set());
  const listed = useSearch(text);
  const publications = listed.status === "ready" ? listed.value : [];
  const heading = text.trim() === "" ? MESSAGES.hub.recent : MESSAGES.hub.results;
  return (
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
              onChange={onSearch}
            />
          </div>
          <QuickTopics
            tags={offeredTags(publications, new Set()).slice(0, MAX_QUICK_TOPICS)}
            pressed={pressedTags}
            onTag={(tag) => {
              setPressed((current) => toggled(current, tag));
            }}
          />
        </div>
        <FeaturedTrip publication={publications[0]} />
      </div>
      <HubLegend />
      <ForYouSection />
      <PublicationsSection heading={heading} listed={listed} pressedTags={pressedTags} />
    </main>
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
