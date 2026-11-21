import type { Flow, NodeManifest } from "@nodomics/protocol";
import { Icon, ICON_SIZE } from "@nodomics/ui";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import type { Route } from "../routing/routes.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import { navigate } from "../routing/use-route.ts";
import { AccountButton } from "./AccountButton.tsx";
import { HubPage } from "./HubPage.tsx";
import { ProfilePage } from "./ProfilePage.tsx";
import { PublicationPage } from "./PublicationPage.tsx";
import "./hub.css";

export type HubRoute = Exclude<Route, { readonly page: "workspace" }>;

/** The hub over the editor, which stays mounted underneath with its flow (ADR 0018, point 7). */
export function HubLayer({ route }: { readonly route: HubRoute }) {
  return (
    <div className="web-hub-layer">
      <header className="web-hub-layer-bar">
        <nav className="web-hub-layer-nav">
          <RouteLink route={{ page: "workspace" }}>
            <Icon name="chevron-left" size={ICON_SIZE.sm} />
            {MESSAGES.hub.back}
          </RouteLink>
          <RouteLink route={{ page: "hub" }}>{MESSAGES.hub.title}</RouteLink>
        </nav>
        <AccountButton />
      </header>
      <HubRoutePage route={route} />
    </div>
  );
}

function HubRoutePage({ route }: { readonly route: HubRoute }) {
  const { openCopy, install } = useHubActions();
  switch (route.page) {
    case "hub":
      return <HubPage />;
    case "profile":
      return <ProfilePage key={route.handle} handle={route.handle} />;
    case "publication":
      return (
        <PublicationPage
          key={`${route.handle}/${route.slug}`}
          handle={route.handle}
          slug={route.slug}
          onOpenCopy={openCopy}
          onInstall={install}
        />
      );
  }
}

function useHubActions() {
  const { savedFlowStore, personalLibraryStore } = useAppStores();
  return {
    openCopy: (flow: Flow) => {
      void savedFlowStore
        .getState()
        .loadFlow(flow)
        .then(() => {
          navigate({ page: "workspace" });
        });
    },
    install: (manifests: ReadonlyArray<NodeManifest>) => {
      personalLibraryStore.getState().install(manifests);
    },
  };
}
