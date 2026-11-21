import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useCallback, useEffect, useId, useState } from "react";
import { useHub, useHubProfile } from "../hub/hub-context.ts";
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
  if (loaded.status === "loading") return <p className="web-hub-muted">{MESSAGES.feed.loading}</p>;
  if (loaded.status === "failed") return <Notice tone="error" title={MESSAGES.feed.card.failed} />;
  const card = saved ?? loaded.value;
  if (!isOwner) return <CardReadOnly card={card} />;
  return <OwnCard feed={feed} card={card} onSaved={setSaved} />;
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

/**
 * Mounted only for the owner, and closed by any change of session: a sign-out followed by a
 * sign-in can batch into one render that looks unchanged, so the hub's events are followed.
 */
function OwnCard({ feed, card, onSaved }: OwnCardProps) {
  const hub = useHub();
  const [isEditing, setEditing] = useState(false);
  useEffect(
    () =>
      hub.onProfileChange(() => {
        setEditing(false);
      }),
    [hub],
  );
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
