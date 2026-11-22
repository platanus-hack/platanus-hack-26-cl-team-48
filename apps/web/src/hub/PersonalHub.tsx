import { Input } from "@nodomics/ui";
import { PeopleSection } from "../feed/PeopleSection.tsx";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import type { EditorOpening } from "../routing/routes.ts";
import { EmptyPanel } from "./EmptyPanel.tsx";
import { ForYouPage } from "./ForYouPage.tsx";
import { useHubProfile } from "./hub-context.ts";
import type { HubTab } from "./HubTabs.tsx";
import { MyFlowsSection } from "./MyFlowsSection.tsx";

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
  if (tab === "people") return <PeoplePage text={text} onSearch={onSearch} />;
  return <ForYouPage text={text} onSearch={onSearch} />;
}

function PeoplePage({
  text,
  onSearch,
}: {
  readonly text: string;
  readonly onSearch: (text: string) => void;
}) {
  const handle = useHubProfile()?.handle;
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
      {text.trim() === "" && handle !== undefined ? (
        <EmptyPanel icon="users" text={MESSAGES.feed.peopleEmpty}>
          <RouteLink
            route={{ page: "profile", handle }}
            className="nd-btn nd-btn-primary nd-btn-md web-hub-empty-action"
          >
            {MESSAGES.feed.completeProfile}
          </RouteLink>
        </EmptyPanel>
      ) : (
        <PeopleSection text={text} browse />
      )}
    </main>
  );
}
