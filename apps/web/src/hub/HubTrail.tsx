import type { PublicationSummary } from "@nodomics/hub";
import { LineageStrip } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import { lineageFromSummary } from "./hub-lineage.ts";
import { KindArt } from "./KindArt.tsx";

/**
 * A publication's preview: a drawing of what it is (an app, a flow of nodes, a node) so the box
 * says something at a glance, and under it the state of its thread. A publication nobody has
 * adapted yet is a seed: a knot and a note instead of a flat line.
 */
export function HubTrail({ publication }: { readonly publication: PublicationSummary }) {
  const events = lineageFromSummary(publication);
  const isSeed = events.every((event) => event === "origin");
  return (
    <div className="web-hub-trail" data-seed={isSeed}>
      <div className="web-hub-trail-art">
        <KindArt kind={publication.kind} />
      </div>
      <p className="web-hub-trail-state">
        {isSeed ? (
          <>
            <span className="web-hub-seed-knot" aria-hidden="true" />
            {MESSAGES.hub.seedTrail}
          </>
        ) : (
          <LineageStrip events={events} className="web-hub-strip" />
        )}
      </p>
    </div>
  );
}
