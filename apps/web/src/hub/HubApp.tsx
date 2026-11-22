import type { Flow } from "@nodomics/protocol";
import { useState } from "react";
import { Input, KnotMark } from "@nodomics/ui";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { RouteLink } from "../routing/RouteLink.tsx";
import type { EditorOpening, Route } from "../routing/routes.ts";
import { navigate, useRoute } from "../routing/use-route.ts";
import { AccountButton } from "./AccountButton.tsx";
import { HubPage } from "./HubPage.tsx";
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
  return (
    <div className="web-hub-app">
      <HubBar
        text={text}
        onSearch={(next) => {
          setText(next);
          if (route.page !== "hub") navigate({ page: "hub" });
        }}
      />
      <div className="web-hub-scroll">
        {route.page === "workspace" || route.page === "hub" ? (
          <HubPage text={text} onSearch={setText} {...navigation} />
        ) : (
          <HubRoutePage route={route} {...navigation} />
        )}
      </div>
    </div>
  );
}

function HubBar({
  text,
  onSearch,
}: {
  readonly text: string;
  readonly onSearch: (text: string) => void;
}) {
  return (
    <header className="web-hub-bar">
      <RouteLink className="web-brand" route={{ page: "hub" }}>
        <KnotMark />
        {MESSAGES.app.title}
        <span className="web-hub-bar-section">{MESSAGES.hub.title}</span>
      </RouteLink>
      <search className="web-hub-bar-search">
        <Input
          type="search"
          icon="search"
          label={MESSAGES.hub.search}
          placeholder={MESSAGES.hub.searchPlaceholder}
          value={text}
          onChange={onSearch}
        />
      </search>
      <div className="web-hub-bar-end">
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
