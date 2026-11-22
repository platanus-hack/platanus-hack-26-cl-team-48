import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { useHubProfile } from "../hub/hub-context.ts";
import { useSessionVersion } from "../hub/use-session-version.ts";
import { MESSAGES } from "../messages.ts";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedService } from "./feed-service.ts";
import { ProfileCardEditor } from "./ProfileCardEditor.tsx";
import { ProfileCardView } from "./ProfileCardView.tsx";
import { useQuery } from "../async/use-query.ts";

/** The collaboration card of a person (ADR 0022 §1), editable by its owner. */
export function ProfileCardSection({ handle }: { readonly handle: string }) {
  const heading = useId();
  const feed = useOptionalFeed();
  if (feed === undefined) return null;
  return (
    <section className="web-feed-section" aria-labelledby={heading}>
      <h2 id={heading}>{MESSAGES.feed.card.title}</h2>
      <CardBody feed={feed} handle={handle} />
    </section>
  );
}

function CardBody({ feed, handle }: { readonly feed: FeedService; readonly handle: string }) {
  const loaded = useQuery(useCallback(() => feed.card(handle), [feed, handle]));
  const [saved, setSaved] = useState<ProfileCard | undefined>(undefined);
  const isOwner = useHubProfile()?.handle === handle;
  const session = useSessionVersion();
  if (loaded.status === "loading") return <p className="web-hub-muted">{MESSAGES.feed.loading}</p>;
  if (loaded.status === "failed") return <Notice tone="error" title={MESSAGES.feed.card.failed} />;
  const card = saved ?? loaded.value;
  if (!isOwner) return <CardReadOnly card={card} />;
  return <OwnCard key={session} feed={feed} card={card} onSaved={setSaved} />;
}

function CardReadOnly({ card }: { readonly card: ProfileCard | undefined }) {
  if (card === undefined) return <p className="web-hub-muted">{MESSAGES.feed.card.empty}</p>;
  return <ProfileCardView card={card} />;
}

type OwnCardProps = {
  readonly feed: FeedService;
  readonly card: ProfileCard | undefined;
  readonly onSaved: (card: ProfileCard) => void;
};

/** Mounted only for the owner, and keyed by the session so a new session starts closed. */
function OwnCard({ feed, card, onSaved }: OwnCardProps) {
  const [isEditing, setEditing] = useState(false);
  if (isEditing)
    return (
      <ProfileCardEditor
        feed={feed}
        initial={card}
        onSaved={(next) => {
          onSaved(next);
          setEditing(false);
        }}
        onCancel={() => {
          setEditing(false);
        }}
      />
    );
  return (
    <>
      <CardReadOnly card={card} />
      <Button
        onClick={() => {
          setEditing(true);
        }}
      >
        {MESSAGES.feed.card.edit}
      </Button>
    </>
  );
}
