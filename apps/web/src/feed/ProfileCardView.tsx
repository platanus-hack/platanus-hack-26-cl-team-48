import type { ProfileCard } from "@nodomics/profile";
import { Badge } from "@nodomics/ui";
import { useId } from "react";
import { MESSAGES } from "../messages.ts";

const LINK_KEYS = ["linkedin", "github", "website"] as const;

/** A collaboration card as other people see it. */
export function ProfileCardView({ card }: { readonly card: ProfileCard }) {
  return (
    <div className="web-feed-card">
      <p>{card.about}</p>
      <Badge tone="accent">{MESSAGES.feed.card.technical[card.technical]}</Badge>
      <ul className="web-feed-domains" aria-label={MESSAGES.feed.card.domains}>
        {card.domains.map(({ name, depth }) => (
          <li key={name}>
            {name} <Badge>{MESSAGES.feed.card.depth[depth]}</Badge>
          </li>
        ))}
      </ul>
      <TextList title={MESSAGES.feed.card.offers} entries={card.offers} />
      <TextList title={MESSAGES.feed.card.seeks} entries={card.seeks} />
      <CardLinks links={card.links} />
    </div>
  );
}

function TextList({
  title,
  entries,
}: {
  readonly title: string;
  readonly entries: ReadonlyArray<string>;
}) {
  const heading = useId();
  if (entries.length === 0) return null;
  return (
    <div>
      <h3 id={heading} className="web-feed-list-title">
        {title}
      </h3>
      <ul aria-labelledby={heading}>
        {entries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

function CardLinks({ links }: { readonly links: ProfileCard["links"] }) {
  return (
    <p className="web-feed-links">
      {LINK_KEYS.map((key) => {
        const url = links[key];
        return url === undefined ? null : (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer">
            {MESSAGES.feed.card.links[key]}
          </a>
        );
      })}
    </p>
  );
}
