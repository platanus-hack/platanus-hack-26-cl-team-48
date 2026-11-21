import { MESSAGES } from "../messages.ts";
import type { Route } from "../routing/routes.ts";
import { RouteLink } from "../routing/RouteLink.tsx";

/** Editor and Hub, the two places of the app; the current one is marked. */
export function SectionNav({ route }: { readonly route: Route }) {
  const isEditor = route.page === "workspace";
  return (
    <nav className="web-seg web-sections" aria-label={MESSAGES.toolbar.sections}>
      <RouteLink route={{ page: "workspace" }} className="web-seg-button" isCurrent={isEditor}>
        {MESSAGES.toolbar.editor}
      </RouteLink>
      <RouteLink route={{ page: "hub" }} className="web-seg-button" isCurrent={!isEditor}>
        {MESSAGES.toolbar.hub}
      </RouteLink>
    </nav>
  );
}
