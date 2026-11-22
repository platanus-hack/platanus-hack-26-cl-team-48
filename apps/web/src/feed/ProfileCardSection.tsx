import type { HubProfile } from "@nodomics/hub";
import type { ProfileCard } from "@nodomics/profile";
import { Button, Notice } from "@nodomics/ui";
import { useCallback, useState } from "react";
import { useQuery } from "../async/use-query.ts";
import { useHubProfile } from "../hub/hub-context.ts";
import { useSessionVersion } from "../hub/use-session-version.ts";
import { MESSAGES } from "../messages.ts";
import { useOptionalFeed } from "./feed-context.ts";
import type { FeedService } from "./feed-service.ts";
import { CardDetails } from "./ProfileCardView.tsx";
import { ProfileHero } from "./ProfileHero.tsx";
import { ProfileInvite } from "./ProfileInvite.tsx";
import { ProfileWizard } from "./ProfileWizard.tsx";

type PersonProps = {
  readonly profile: HubProfile;
  readonly publicationCount: number;
};

/** A person's presentation card (ADR 0022 §1): who they are, what they offer and seek. */
export function ProfileCardSection(props: PersonProps) {
  const feed = useOptionalFeed();
  if (feed === undefined) return <ProfileHero {...props} />;
  return <CardBody feed={feed} {...props} />;
}

function CardBody({ feed, ...person }: PersonProps & { readonly feed: FeedService }) {
  const { handle } = person.profile;
  const loaded = useQuery(useCallback(() => feed.card(handle), [feed, handle]));
  const [saved, setSaved] = useState<ProfileCard | undefined>(undefined);
  const isOwner = useHubProfile()?.handle === handle;
  const session = useSessionVersion();
  if (loaded.status === "loading")
    return <PersonWithMessage person={person} message={MESSAGES.feed.loading} />;
  if (loaded.status === "failed")
    return (
      <>
        <ProfileHero {...person} />
        <Notice tone="error" title={MESSAGES.feed.card.failed} />
      </>
    );
  const card = saved ?? loaded.value;
  if (!isOwner) return <VisitorView person={person} card={card} />;
  return <OwnerView key={session} feed={feed} person={person} card={card} onSaved={setSaved} />;
}

function PersonWithMessage({
  person,
  message,
}: {
  readonly person: PersonProps;
  readonly message: string;
}) {
  return (
    <>
      <ProfileHero {...person} />
      <p className="web-hub-muted">{message}</p>
    </>
  );
}

type CardViewProps = {
  readonly person: PersonProps;
  readonly card: ProfileCard | undefined;
};

function VisitorView({ person, card }: CardViewProps) {
  if (card === undefined)
    return (
      <PersonWithMessage
        person={person}
        message={MESSAGES.feed.invite.visitor(person.profile.handle)}
      />
    );
  return (
    <>
      <ProfileHero {...person} card={card} />
      <CardDetails card={card} />
    </>
  );
}

type OwnerViewProps = CardViewProps & {
  readonly feed: FeedService;
  readonly onSaved: (card: ProfileCard) => void;
};

/** Mounted only for the owner, and keyed by the session so a new session starts closed. */
function OwnerView({ feed, person, card, onSaved }: OwnerViewProps) {
  const [isEditing, setEditing] = useState(false);
  const open = () => {
    setEditing(true);
  };
  if (isEditing)
    return (
      <>
        <ProfileHero {...person} />
        <ProfileWizard
          feed={feed}
          profile={person.profile}
          initial={card}
          onSaved={(next) => {
            onSaved(next);
            setEditing(false);
          }}
          onCancel={() => {
            setEditing(false);
          }}
        />
      </>
    );
  if (card === undefined)
    return (
      <>
        <ProfileHero {...person} />
        <ProfileInvite>
          <Button variant="primary" size="lg" icon="sparkles" onClick={open}>
            {MESSAGES.feed.invite.start}
          </Button>
        </ProfileInvite>
      </>
    );
  return (
    <>
      <ProfileHero
        {...person}
        card={card}
        action={
          <Button icon="user" onClick={open}>
            {MESSAGES.feed.card.edit}
          </Button>
        }
      />
      <CardDetails card={card} />
    </>
  );
}
