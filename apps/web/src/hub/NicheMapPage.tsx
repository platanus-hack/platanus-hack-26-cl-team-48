import { Input } from "@nodomics/ui";
import type { FeedService } from "../feed/feed-service.ts";
import { PeopleMapPanel } from "../feed/PeopleMapPanel.tsx";
import { MESSAGES } from "../messages.ts";

type NicheMapPageProps = {
  readonly load: NonNullable<FeedService["mapPeople"]>;
  readonly text: string;
  readonly onSearch: (text: string) => void;
};

/** "Mapa de nichos": the people of the hub grouped by what they offer. */
export function NicheMapPage({ load, text, onSearch }: NicheMapPageProps) {
  return (
    <main className="web-hub-page">
      <h1 className="web-hub-tab-title">{MESSAGES.hub.views.map}</h1>
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
      <PeopleMapPanel load={load} text={text} />
    </main>
  );
}
