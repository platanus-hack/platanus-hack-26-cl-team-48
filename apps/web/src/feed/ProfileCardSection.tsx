import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useCallback, useId, useState } from "react";
import { useHubProfile } from "../hub/hub-context.ts";
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
  const [isEditing, setEditing] = useState(false);
  const isOwner = useHubProfile()?.handle === handle;
  if (loaded.status === "loading") return <p className="web-hub-muted">{MESSAGES.feed.loading}</p>;
  if (loaded.status === "failed") return <Notice tone="error" title={MESSAGES.feed.card.failed} />;
  const card = saved ?? loaded.value;
  if (isEditing)
    return (
      <ProfileCardEditor
        feed={feed}
        initial={card}
        onSaved={(next) => {
          setSaved(next);
          setEditing(false);
        }}
        onCancel={() => {
          setEditing(false);
        }}
      />
    );
  return (
    <>
      {card === undefined ? (
        <p className="web-hub-muted">{MESSAGES.feed.card.empty}</p>
      ) : (
        <ProfileCardView card={card} />
      )}
      {isOwner && (
        <Button
          onClick={() => {
            setEditing(true);
          }}
        >
          {MESSAGES.feed.card.edit}
        </Button>
      )}
    </>
  );
}
