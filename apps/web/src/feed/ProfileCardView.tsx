import type { DomainDepth, ProfileCard } from "@nodomics/profile";
import { Icon, type IconName } from "@nodomics/ui";
import { useId } from "react";
import { MESSAGES } from "../messages.ts";

const TEXT = MESSAGES.feed.card;
const LINK_KEYS = ["linkedin", "github", "website"] as const;
const DEPTH_DOTS: Readonly<Record<DomainDepth, number>> = {
  curious: 1,
  practitioner: 2,
  expert: 3,
};
const MAX_DOTS = 3;

/** The pill, the about text and the links: the top of a person's presentation card. */
export function CardSummary({ card }: { readonly card: ProfileCard }) {
  return (
    <div className="web-feed-summary">
      <span className="web-feed-pill">{TEXT.technical[card.technical]}</span>
      {card.about !== "" && <p className="web-feed-about">{card.about}</p>}
      <CardLinks links={card.links} />
    </div>
  );
}

/** What the person offers and seeks, side by side, and the topics they know. */
export function CardDetails({ card }: { readonly card: ProfileCard }) {
  return (
    <div className="web-feed-details">
      {(card.offers.length > 0 || card.seeks.length > 0) && (
        <div className="web-feed-columns">
          <EntryPanel icon="users" title={TEXT.offers} entries={card.offers} />
          <EntryPanel icon="search" title={TEXT.seeks} entries={card.seeks} />
        </div>
      )}
      <DomainPanel domains={card.domains} />
    </div>
  );
}

type EntryPanelProps = {
  readonly icon: IconName;
  readonly title: string;
  readonly entries: ReadonlyArray<string>;
};

function EntryPanel({ icon, title, entries }: EntryPanelProps) {
  const heading = useId();
  if (entries.length === 0) return null;
  return (
    <section className="web-feed-panel" aria-labelledby={heading}>
      <h3 id={heading} className="web-feed-panel-title">
        <Icon name={icon} />
        {title}
      </h3>
      <ul className="web-feed-tag-list" aria-labelledby={heading}>
        {entries.map((entry) => (
          <li key={entry} className="web-feed-tag">
            {entry}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DomainPanel({ domains }: { readonly domains: ProfileCard["domains"] }) {
  const heading = useId();
  if (domains.length === 0) return null;
  return (
    <section className="web-feed-panel" aria-labelledby={heading}>
      <h3 id={heading} className="web-feed-panel-title">
        <Icon name="star" />
        {TEXT.domains}
      </h3>
      <ul className="web-feed-tag-list" aria-labelledby={heading}>
        {domains.map(({ name, depth }) => (
          <li key={name} className="web-feed-tag web-feed-domain">
            {name}
            <span className="web-feed-depth">
              <DepthDots depth={depth} />
              {TEXT.depth[depth]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A visual hint of the level; the label next to it says the same in words. */
function DepthDots({ depth }: { readonly depth: DomainDepth }) {
  return (
    <span className="web-feed-dots" aria-hidden="true">
      {Array.from({ length: MAX_DOTS }, (_, index) => (
        <span key={index} className={index < DEPTH_DOTS[depth] ? "is-on" : undefined} />
      ))}
    </span>
  );
}

function CardLinks({ links }: { readonly links: ProfileCard["links"] }) {
  const present = LINK_KEYS.filter((key) => links[key] !== undefined);
  if (present.length === 0) return null;
  return (
    <p className="web-feed-links">
      {present.map((key) => (
        <a
          key={key}
          className="web-feed-link"
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="globe" />
          {TEXT.links[key]}
        </a>
      ))}
    </p>
  );
}
