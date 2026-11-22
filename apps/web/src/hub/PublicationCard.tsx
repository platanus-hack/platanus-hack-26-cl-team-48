import type { PublicationSummary } from "@nodomics/hub";
import { LineageStrip } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { lineageFromSummary } from "./hub-lineage.ts";
import { KindArt } from "./KindArt.tsx";

/** One publication in a list of the hub; the whole card opens it. */
export function PublicationCard({ publication }: { readonly publication: PublicationSummary }) {
  const { owner, slug, kind, title, description, tags } = publication;
  const events = lineageFromSummary(publication);
  const kindLabel = MESSAGES.hub.kindLabel[kind];
  const theme = tags[0];

  return (
    <article className="web-hub-card" data-kind={kind}>
      <p className="web-hub-card-kind">
        {theme === undefined ? (
          <b>{kindLabel}</b>
        ) : (
          <>
            <b>{theme}</b>
            {`, ${kindLabel.toLowerCase()}`}
          </>
        )}
      </p>
      <h3 className="web-hub-card-title">
        <RouteLink
          route={{ page: "publication", handle: owner.handle, slug }}
          className="web-hub-card-link"
        >
          {title}
        </RouteLink>
      </h3>
      {description !== "" && <p className="web-hub-card-desc">{description}</p>}
      <div className="web-hub-trail">
        <LineageStrip events={events} className="web-hub-strip" />
      </div>
      <p className="web-hub-who">
        <RouteLink route={{ page: "profile", handle: owner.handle }} className="web-hub-owner">
          {owner.displayName !== "" && <span>{owner.displayName}</span>}
          <span>{`@${owner.handle}`}</span>
        </RouteLink>
      </p>
    </article>
  );
}

type ListProps = {
  readonly publications: ReadonlyArray<PublicationSummary>;
  readonly empty: string;
};

export function PublicationList({ publications, empty }: ListProps) {
  if (publications.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="web-hub-grid">
      {publications.map((publication) => (
        <PublicationCard key={publication.id} publication={publication} />
      ))}
    </div>
  );
}

export function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="web-hub-empty">
      <KindArt kind="flow" />
      <p>{text}</p>
    </div>
  );
}
