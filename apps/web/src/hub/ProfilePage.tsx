import { ok } from "@nodomics/protocol";
import { Notice } from "@nodomics/ui";
import { useCallback, useId, type ComponentProps } from "react";
import { ProfileCardSection } from "../feed/ProfileCardSection.tsx";
import { MESSAGES } from "../messages.ts";
import { useHub } from "./hub-context.ts";
import { EmptyState, PublicationList } from "./PublicationCard.tsx";
import { useQuery } from "../async/use-query.ts";

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
        <EmptyState text={MESSAGES.hub.noProfile(handle)} />
      ) : (
        <>
          <ProfileCardSection profile={profile} publicationCount={publications.length} />
          <PublicationsSection publications={publications} />
        </>
      )}
    </main>
  );
}

function PublicationsSection({
  publications,
}: {
  readonly publications: ComponentProps<typeof PublicationList>["publications"];
}) {
  const heading = useId();
  return (
    <section className="web-feed-publications" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.feed.card.publications}</h2>
      <PublicationList publications={publications} empty={MESSAGES.hub.noPublications} />
    </section>
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
  return useQuery(ask);
}
