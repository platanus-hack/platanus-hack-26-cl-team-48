import type { FeedHit } from "@nodomics/profile";
import { Notice } from "@nodomics/ui";
import { useId } from "react";
import { useHubProfile } from "../hub/hub-context.ts";
import { useSessionVersion } from "../hub/use-session-version.ts";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedError, FeedService } from "./feed-service.ts";
import { HitSummary } from "./HitSummary.tsx";
import { ProfileInvite } from "./ProfileInvite.tsx";
import { useQuery } from "../async/use-query.ts";

/** The people, nodes and flows that complement the signed-in person (ADR 0022 §3). */
export function ForYouSection() {
  const heading = useId();
  const feed = useOptionalFeed();
  return (
    <section className="web-hub-for-you" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.hub.forYou}</h2>
      {feed !== undefined && <ForYouBody feed={feed} />}
    </section>
  );
}

function ForYouBody({ feed }: { readonly feed: FeedService }) {
  const profile = useHubProfile();
  const session = useSessionVersion();
  if (profile === undefined) return <p className="web-hub-muted">{MESSAGES.feed.forYouSignIn}</p>;
  return <Matches key={session} feed={feed} handle={profile.handle} />;
}

function Matches({ feed, handle }: { readonly feed: FeedService; readonly handle: string }) {
  const matches = useQuery(feed.matches);
  switch (matches.status) {
    case "loading":
      return <p className="web-hub-muted">{MESSAGES.feed.loading}</p>;
    case "failed":
      return <MatchesFailure error={matches.error} handle={handle} />;
    case "ready":
      return <MatchList hits={matches.value} />;
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

function MatchList({ hits }: { readonly hits: ReadonlyArray<FeedHit> }) {
  if (hits.length === 0) return <p className="web-hub-muted">{MESSAGES.feed.forYouEmpty}</p>;
  return (
    <ul className="web-hub-for-you-list">
      {hits.map((hit) => (
        <li key={`${hit.kind}:${hit.id}`} className="web-hub-for-you-card">
          <span className="web-hub-for-you-kind">{MESSAGES.feed.kindLabel[hit.kind]}</span>
          <HitTitle hit={hit} />
          <HitSummary hit={hit} />
        </li>
      ))}
    </ul>
  );
}

function HitTitle({ hit }: { readonly hit: FeedHit }) {
  if (hit.kind !== "profile") return <strong>{hit.title}</strong>;
  return (
    <strong>
      <RouteLink route={{ page: "profile", handle: hit.id }}>{hit.title}</RouteLink>
    </strong>
  );
}
