import type { Flow } from "@nodomics/protocol";
import { useState } from "react";
import { ICON_SIZE, Icon, Input } from "@nodomics/ui";
import { useAppStores } from "../app-context.ts";
import { encodeSharedFlow } from "../flow/flow-file.ts";
import { MESSAGES } from "../messages.ts";
import { pathOf, type Route } from "../routing/routes.ts";
import { navigate, useRoute } from "../routing/use-route.ts";
import { AccountButton } from "./AccountButton.tsx";
import { HubPage } from "./HubPage.tsx";
import { ProfilePage } from "./ProfilePage.tsx";
import { PublicationPage } from "./PublicationPage.tsx";
import "../feed/feed.css";
import "./hub.css";

type PageRoute = Exclude<Route, { readonly page: "workspace" | "hub" }>;

/** The hub in its own browser tab (ADR 0018); flows open as a copy in a new editor tab. */
export function HubApp() {
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
          <HubPage text={text} />
        ) : (
          <HubRoutePage route={route} />
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
      <p className="web-brand">
        <span className="web-brand-mark" aria-hidden="true" />
        {MESSAGES.app.title}
        <span className="web-hub-bar-section">{MESSAGES.hub.title}</span>
      </p>
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
        <a
          className="nd-btn nd-btn-secondary"
          href={pathOf({ page: "workspace" })}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="workflow" size={ICON_SIZE.md} />
          {MESSAGES.hub.openEditor}
        </a>
        <AccountButton />
      </div>
    </header>
  );
}

function HubRoutePage({ route }: { readonly route: PageRoute }) {
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
          onOpenCopy={openCopyInEditorTab}
          onInstall={(manifests) => {
            personalLibraryStore.getState().install(manifests);
          }}
        />
      );
  }
}

const openCopyInEditorTab = (flow: Flow) => {
  window.open(`/${encodeSharedFlow(flow)}`, "_blank", "noopener");
};
