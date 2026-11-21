import type { PublicationSummary } from "@nodomics/hub";
import { Icon, ICON_SIZE } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";

/** One publication in a list of the hub, styled as the design system's Hub card. */
export function PublicationCard({ publication }: { readonly publication: PublicationSummary }) {
  const { owner, slug, kind, title, description, latestVersion } = publication;
  return (
    <article className="nd-hub">
      <div className="nd-hub-body">
        <div className="nd-hub-kind">
          <Icon name="workflow" size={ICON_SIZE.xs} />
          {MESSAGES.hub.kindLabel[kind]}
          {latestVersion !== undefined && <span className="nd-hub-ver">{latestVersion}</span>}
        </div>
        <h3 className="nd-hub-title">
          <RouteLink route={{ page: "publication", handle: owner.handle, slug }}>{title}</RouteLink>
        </h3>
        <div className="nd-hub-author">
          <RouteLink
            route={{ page: "profile", handle: owner.handle }}
          >{`@${owner.handle}`}</RouteLink>
        </div>
        {description !== "" && <p className="nd-hub-desc">{description}</p>}
      </div>
    </article>
  );
}

type ListProps = {
  readonly publications: ReadonlyArray<PublicationSummary>;
  readonly empty: string;
};

export function PublicationList({ publications, empty }: ListProps) {
  if (publications.length === 0) return <p className="web-hub-empty">{empty}</p>;
  return (
    <div className="web-hub-grid">
      {publications.map((publication) => (
        <PublicationCard key={publication.id} publication={publication} />
      ))}
    </div>
  );
}
