import type { FeedHit } from "@nodomics/profile";
import { Notice } from "@nodomics/ui";
import { useId, type ReactNode } from "react";
import { useHubProfile } from "../hub/hub-context.ts";
import { useSessionVersion } from "../hub/use-session-version.ts";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedError, FeedService } from "./feed-service.ts";
import { ComponentHitCard, PersonHitCard } from "./HitCards.tsx";
import { ProfileInvite } from "./ProfileInvite.tsx";
import { useQuery } from "../async/use-query.ts";

type Search = (text: string) => void;

/** The people, nodes and flows that complement the signed-in person (ADR 0022 §3). */
export function ForYouSection({ onSearch }: { readonly onSearch: Search }) {
  const heading = useId();
  const feed = useOptionalFeed();
  return (
    <section className="web-hub-for-you" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.hub.forYou}</h2>
      {feed !== undefined && <ForYouBody feed={feed} onSearch={onSearch} />}
    </section>
  );
}

function ForYouBody({ feed, onSearch }: { readonly feed: FeedService; readonly onSearch: Search }) {
  const profile = useHubProfile();
  const session = useSessionVersion();
  if (profile === undefined) return <p className="web-hub-muted">{MESSAGES.feed.forYouSignIn}</p>;
  return <Matches key={session} feed={feed} handle={profile.handle} onSearch={onSearch} />;
}

type MatchesProps = {
  readonly feed: FeedService;
  readonly handle: string;
  readonly onSearch: Search;
};

function Matches({ feed, handle, onSearch }: MatchesProps) {
  const matches = useQuery(feed.matches);
  switch (matches.status) {
    case "loading":
      return <p className="web-hub-muted">{MESSAGES.feed.loading}</p>;
    case "failed":
      return <MatchesFailure error={matches.error} handle={handle} />;
    case "ready":
      return <MatchGroups hits={matches.value} onSearch={onSearch} />;
  }
}

function MatchesFailure({ error, handle }: { readonly error: FeedError; readonly handle: string }) {
  if (error.code !== "NO_PROFILE")
    return <Notice tone="error" title={MESSAGES.feed.forYouFailed} />;
  return (
    <ProfileInvite>
      <RouteLink route={{ page: "profile", handle }} className="web-feed-invite-link">
        {MESSAGES.feed.invite.start}
      </RouteLink>
    </ProfileInvite>
  );
}

function MatchGroups({
  hits,
  onSearch,
}: {
  readonly hits: ReadonlyArray<FeedHit>;
  readonly onSearch: Search;
}) {
  if (hits.length === 0) return <p className="web-hub-muted">{MESSAGES.feed.forYouEmpty}</p>;
  const people = hits.filter((hit) => hit.kind === "profile");
  const components = hits.filter((hit) => hit.kind !== "profile");
  return (
    <>
      <MatchGroup heading={MESSAGES.feed.complementaryPeople} hits={people}>
        {(hit) => <PersonHitCard hit={hit} />}
      </MatchGroup>
      <MatchGroup heading={MESSAGES.feed.forYouComponents} hits={components}>
        {(hit) => <ComponentHitCard hit={hit} onSearch={onSearch} />}
      </MatchGroup>
    </>
  );
}

function MatchGroup(props: {
  readonly heading: string;
  readonly hits: ReadonlyArray<FeedHit>;
  readonly children: (hit: FeedHit) => ReactNode;
}) {
  const heading = useId();
  if (props.hits.length === 0) return null;
  return (
    <section className="web-hub-for-you-group" aria-labelledby={heading}>
      <h3 id={heading}>{props.heading}</h3>
      <ul className="web-hub-for-you-list" aria-labelledby={heading}>
        {props.hits.map((hit) => (
          <li key={`${hit.kind}:${hit.id}`}>{props.children(hit)}</li>
        ))}
      </ul>
    </section>
  );
}
