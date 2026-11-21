import type { PublicationSummary } from "@nodomics/hub";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { Avatar } from "./Avatar.tsx";
import { KindArt } from "./KindArt.tsx";

const VISIBLE_TAGS = 3;

/** One publication in a list of the hub; the whole card opens it. */
export function PublicationCard({ publication }: { readonly publication: PublicationSummary }) {
  const { owner, slug, kind, title, description, latestVersion, tags } = publication;
  return (
    <article className="web-hub-card" data-kind={kind}>
      <div className="web-hub-card-art">
        <KindArt kind={kind} />
      </div>
      <div className="web-hub-card-body">
        <div className="web-hub-card-meta">
          <span className="web-kind-tag" data-kind={kind}>
            {MESSAGES.hub.kindLabel[kind]}
          </span>
          {latestVersion !== undefined && <span className="web-hub-mono">{latestVersion}</span>}
        </div>
        <h3 className="web-hub-card-title">
          <RouteLink
            route={{ page: "publication", handle: owner.handle, slug }}
            className="web-hub-card-link"
          >
            {title}
          </RouteLink>
        </h3>
        {description !== "" && <p className="web-hub-card-desc">{description}</p>}
        <footer className="web-hub-card-foot">
          <RouteLink route={{ page: "profile", handle: owner.handle }} className="web-hub-owner">
            <Avatar name={owner.displayName} url={owner.avatarUrl} />
            {`@${owner.handle}`}
          </RouteLink>
          <span className="web-hub-tags">
            {tags.slice(0, VISIBLE_TAGS).map((tag) => (
              <span key={tag} className="web-hub-tag">
                {tag}
              </span>
            ))}
          </span>
        </footer>
      </div>
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
