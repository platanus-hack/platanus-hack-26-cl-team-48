import { Input } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { AccountButton } from "./AccountButton.tsx";
import { HubThread } from "./HubThread.tsx";
import { RecentPublications, SearchResults } from "./PublicationResults.tsx";

type HubLandingProps = {
  readonly text: string;
  readonly onSearch: (text: string) => void;
};

/** The home page while signed out: what the hub is for, a search and the way in. */
export function HubLanding({ text, onSearch }: HubLandingProps) {
  const { landing } = MESSAGES.hub;
  return (
    <main className="web-hub-page web-hub-landing">
      <div className="web-hub-landing-main">
        <h1 className="web-hub-landing-title">{landing.title}</h1>
        <p className="web-hub-landing-sub">{landing.subtitle}</p>
        <div className="web-hub-hero-search" role="search">
          <Input
            type="text"
            icon="search"
            label={landing.searchLabel}
            placeholder={landing.searchPlaceholder}
            value={text}
            onChange={onSearch}
          />
        </div>
      </div>
      {text.trim() === "" ? <RecentPublications /> : <SearchResults text={text} />}
      <HubThread />
      <div className="web-hub-landing-close">
        <p>{landing.closing}</p>
        <AccountButton variant="primary" />
      </div>
    </main>
  );
}
