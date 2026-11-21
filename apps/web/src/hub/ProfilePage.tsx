import type { HubProfile, PublicationSummary } from "@nodomics/hub";
import { ok } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
import { useCallback } from "react";
import { MESSAGES } from "../messages.ts";
import { useHub } from "./hub-context.ts";
import { PublicationList } from "./PublicationCard.tsx";
import { useHubQuery } from "./use-hub-query.ts";

type ProfileWithPublications = {
  readonly profile: HubProfile | undefined;
  readonly publications: ReadonlyArray<PublicationSummary>;
};

/** A person and what they published (ADR 0018, `/u/<handle>`). */
export function ProfilePage({ handle }: { readonly handle: string }) {
  const page = useProfile(handle);
  if (page.status === "loading") return <main className="web-hub-page" />;
  if (page.status === "failed")
    return (
      <main className="web-hub-page">
        <Notice tone="error" title={MESSAGES.hub.failed} />
      </main>
    );
  const { profile, publications } = page.value;
  return (
    <main className="web-hub-page">
      {profile === undefined ? (
        <p className="web-hub-empty">{MESSAGES.hub.noProfile(handle)}</p>
      ) : (
        <>
          <header className="web-hub-profile">
            {profile.avatarUrl !== undefined && <img src={profile.avatarUrl} alt="" />}
            <h1>{profile.displayName}</h1>
            <span>{`@${profile.handle}`}</span>
          </header>
          <PublicationList publications={publications} empty={MESSAGES.hub.noPublications} />
        </>
      )}
    </main>
  );
}

function useProfile(handle: string) {
  const hub = useHub();
  const ask = useCallback(async () => {
    const [profile, publications] = await Promise.all([
      hub.profile(handle),
      hub.publicationsOf(handle),
    ]);
    if (!profile.ok) return profile;
    if (!publications.ok) return publications;
    return ok({ profile: profile.value, publications: publications.value });
  }, [hub, handle]);
  return useHubQuery<ProfileWithPublications>(ask);
}
