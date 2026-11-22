import { Input } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { AccountButton } from "./AccountButton.tsx";
import { Highlighted } from "./Highlighted.tsx";
import { HubShare } from "./HubShare.tsx";
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
    <main className="web-hub-landing">
      <div className="web-hub-landing-inner web-hub-landing-top">
        <div className="web-hub-landing-main">
          <h1 className="web-hub-landing-title">
            <Highlighted text={landing.title} emphasis={landing.titleEmphasis} />
          </h1>
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
      </div>
      <HubThread />
      <HubShare />
      <section className="web-hub-band web-hub-landing-close">
        <p>{landing.closing}</p>
        <AccountButton variant="secondary" />
      </section>
      <p className="web-hub-landing-footer">{landing.footer}</p>
    </main>
  );
}
