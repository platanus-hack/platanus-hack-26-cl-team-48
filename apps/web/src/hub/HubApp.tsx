import type { Flow, NodeManifest } from "@nodomics/protocol";
import { ICON_SIZE, Icon } from "@nodomics/ui";
import { useAppStores } from "../app-context.ts";
import { encodeSharedFlow } from "../flow/flow-file.ts";
import { MESSAGES } from "../messages.ts";
import type { Route } from "../routing/routes.ts";
import { useRoute } from "../routing/use-route.ts";
import { AccountButton } from "./AccountButton.tsx";
import { HubPage } from "./HubPage.tsx";
import { ProfilePage } from "./ProfilePage.tsx";
import { PublicationPage } from "./PublicationPage.tsx";
import "./hub.css";

type HubRoute = Exclude<Route, { readonly page: "workspace" }>;

/** The hub in its own browser tab (ADR 0018); flows open as a copy in a new editor tab. */
export function HubApp() {
  const route = useRoute();
  return (
    <div className="web-hub-app">
      <HubBar />
      <div className="web-hub-scroll">
        {route.page === "workspace" ? <HubPage /> : <HubRoutePage route={route} />}
      </div>
    </div>
  );
}

function HubBar() {
  return (
    <header className="web-hub-bar">
      <p className="web-brand">
        <span className="web-brand-mark" aria-hidden="true" />
        {MESSAGES.app.title}
        <span className="web-hub-bar-section">{MESSAGES.hub.title}</span>
      </p>
      <div className="web-hub-bar-end">
        <a className="nd-btn nd-btn-secondary" href="/" target="_blank" rel="noopener noreferrer">
          <Icon name="workflow" size={ICON_SIZE.md} />
          {MESSAGES.hub.openEditor}
        </a>
        <AccountButton />
      </div>
    </header>
  );
}

function HubRoutePage({ route }: { readonly route: HubRoute }) {
  const { personalLibraryStore } = useAppStores();
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
          onOpenCopy={openCopyInEditorTab}
          onInstall={(manifests: ReadonlyArray<NodeManifest>) => {
            personalLibraryStore.getState().install(manifests);
          }}
        />
      );
  }
}

const openCopyInEditorTab = (flow: Flow) => {
  window.open(`/${encodeSharedFlow(flow)}`, "_blank", "noopener");
};
