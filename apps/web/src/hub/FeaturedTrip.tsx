import type { PublicationSummary } from "@nodomics/hub";
import { LineageStrip } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { lineageFromSummary } from "./hub-lineage.ts";

const UPDATED = new Intl.DateTimeFormat("es", { month: "short", year: "numeric" });

/** The newest real publication, shown beside the hero; nothing when the hub is empty. */
export function FeaturedTrip({ publication }: { readonly publication?: PublicationSummary }) {
  if (publication === undefined) return null;
  const { owner, slug, kind, title, description, updatedAt } = publication;
  return (
    <aside className="web-hub-trip" aria-label={MESSAGES.hub.featured}>
      <p className="web-hub-trip-kind">{MESSAGES.hub.kindLabel[kind]}</p>
      <h2 className="web-hub-trip-title">
        <RouteLink
          route={{ page: "publication", handle: owner.handle, slug }}
          className="web-hub-card-link"
        >
          {title}
        </RouteLink>
      </h2>
      {description !== "" && <p className="web-hub-trip-desc">{description}</p>}
      <div className="web-hub-trail">
        <LineageStrip events={lineageFromSummary(publication)} className="web-hub-strip" />
      </div>
      <footer className="web-hub-trip-foot">
        <RouteLink route={{ page: "profile", handle: owner.handle }} className="web-hub-owner">
          {owner.displayName !== "" && <span>{owner.displayName}</span>}
          <span>{`@${owner.handle}`}</span>
        </RouteLink>
        <time dateTime={updatedAt}>{UPDATED.format(new Date(updatedAt))}</time>
      </footer>
    </aside>
  );
}
