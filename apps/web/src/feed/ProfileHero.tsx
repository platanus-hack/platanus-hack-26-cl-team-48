import type { HubProfile } from "@nodomics/hub";
import type { ProfileCard } from "@nodomics/profile";
import type { ReactNode } from "react";
import { Avatar } from "../hub/Avatar.tsx";
import { MESSAGES } from "../messages.ts";
import { CardSummary } from "./ProfileCardView.tsx";

type ProfileHeroProps = {
  readonly profile: HubProfile;
  readonly publicationCount: number;
  readonly card?: ProfileCard | undefined;
  readonly action?: ReactNode;
};

/** The head of a person's page: who they are and, with a card, how they work with others. */
export function ProfileHero({ profile, publicationCount, card, action }: ProfileHeroProps) {
  return (
    <header className="web-feed-hero">
      <Avatar name={profile.displayName} url={profile.avatarUrl} size="lg" />
      <div className="web-feed-hero-body">
        <div className="web-feed-hero-top">
          <div className="web-feed-hero-name">
            <h1>{profile.displayName}</h1>
            <p className="web-hub-muted">
              <span>{`@${profile.handle}`}</span>
              <span aria-hidden="true">·</span>
              <span>{MESSAGES.hub.publications(publicationCount)}</span>
            </p>
          </div>
          {action}
        </div>
        {card !== undefined && <CardSummary card={card} />}
      </div>
    </header>
  );
}
