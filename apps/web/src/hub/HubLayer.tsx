import type { Flow, NodeManifest } from "@nodomics/protocol";
import { useAppStores } from "../app-context.ts";
import type { Route } from "../routing/routes.ts";
import { navigate } from "../routing/use-route.ts";
import { HubPage } from "./HubPage.tsx";
import { ProfilePage } from "./ProfilePage.tsx";
import { PublicationPage } from "./PublicationPage.tsx";
import "./hub.css";

export type HubRoute = Exclude<Route, { readonly page: "workspace" }>;

/** The hub under the app bar, over the editor, which stays mounted with its flow (ADR 0018). */
export function HubLayer({ route }: { readonly route: HubRoute }) {
  return (
    <div className="web-hub-layer">
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
