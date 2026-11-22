import type { Flow } from "@nodomics/protocol";
import { useState } from "react";
import { KnotMark } from "@nodomics/ui";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import type { EditorOpening, Route } from "../routing/routes.ts";
import { navigate, useRoute } from "../routing/use-route.ts";
import { StoredThemeControl } from "../theme/StoredThemeControl.tsx";
import { AccountButton } from "./AccountButton.tsx";
import { useHubProfile } from "./hub-context.ts";
import { HubPage } from "./HubPage.tsx";
import { HubTabs, type HubTab } from "./HubTabs.tsx";
import { ProfilePage } from "./ProfilePage.tsx";
import { PublicationPage } from "./PublicationPage.tsx";
import "../feed/feed.css";
import "./hub.css";

type PageRoute = Exclude<Route, { readonly page: "workspace" | "hub" }>;

export type HubNavigation = {
  readonly onOpenEditor: (opening: EditorOpening) => void;
  readonly onOpenCopy: (flow: Flow) => void;
};

/** The home page (ADR 0024); the composition root decides how to reach the editor. */
export function HubApp(navigation: HubNavigation) {
  const route = useRoute();
  const [text, setText] = useState("");
  const [tab, setTab] = useState<HubTab>("for-you");
  return (
    <div className="web-hub-app">
      <HubBar
        tab={tab}
        onTab={(next) => {
          setTab(next);
          if (route.page !== "hub") navigate({ page: "hub" });
        }}
        onOpenEditor={() => {
          navigation.onOpenEditor({ kind: "latest" });
        }}
      />
      <div className="web-hub-scroll">
        {route.page === "workspace" || route.page === "hub" ? (
          <HubPage text={text} tab={tab} onSearch={setText} {...navigation} />
        ) : (
          <HubRoutePage route={route} {...navigation} />
        )}
      </div>
    </div>
  );
}

type HubBarProps = {
  readonly tab: HubTab;
  readonly onTab: (tab: HubTab) => void;
  readonly onOpenEditor: () => void;
};

function HubBar({ tab, onTab, onOpenEditor }: HubBarProps) {
  const isSignedIn = useHubProfile()?.handle !== undefined;
  return (
    <header className="web-hub-bar">
      <RouteLink className="web-brand" route={{ page: "hub" }}>
        <KnotMark />
        {MESSAGES.app.title}
      </RouteLink>
      {isSignedIn && <HubTabs tab={tab} onTab={onTab} onOpenEditor={onOpenEditor} />}
      <div className="web-hub-bar-end">
        <StoredThemeControl />
        <AccountButton />
      </div>
    </header>
  );
}

function HubRoutePage({ route, ...navigation }: { readonly route: PageRoute } & HubNavigation) {
  const { personalLibraryStore } = useAppStores();
  switch (route.page) {
    case "profile":
      return <ProfilePage key={route.handle} handle={route.handle} />;
    case "publication":
      return (
        <PublicationPage
          key={`${route.handle}/${route.slug}`}
          handle={route.handle}
          slug={route.slug}
          {...navigation}
          onInstall={(manifests) => {
            personalLibraryStore.getState().install(manifests);
          }}
        />
      );
  }
}
