import type { ReactNode } from "react";
import { AccountButton } from "../hub/AccountButton.tsx";
import { SavedFlows } from "../library/SavedFlows.tsx";
import { MESSAGES } from "../messages.ts";
import { useRoute } from "../routing/use-route.ts";
import { EngineSelector, type EngineSelectorProps } from "./EngineSelector.tsx";
import { HistoryButtons } from "./HistoryButtons.tsx";
import { RunButton } from "./RunButton.tsx";
import { SectionNav } from "./SectionNav.tsx";
import { ShareMenu } from "./ShareMenu.tsx";

type ToolbarProps = EngineSelectorProps & {
  /** Workspace controls placed before the account, such as the theme. */
  readonly children?: ReactNode;
};

/**
 * The app bar, the same in the editor and the hub: the sections on the left, the open flow in the
 * middle and its actions on the right; in the hub only the sections and the account remain.
 */
export function Toolbar({ children, ...engine }: ToolbarProps) {
  const route = useRoute();
  const isEditor = route.page === "workspace";
  return (
    <header className="web-toolbar" aria-label={MESSAGES.toolbar.label} data-canvas-inset="top">
      <div className="web-toolbar-start">
        <h1 className="web-brand">
          <span className="web-brand-mark" aria-hidden="true" />
          {MESSAGES.app.title}
        </h1>
        <SectionNav route={route} />
      </div>
      {isEditor && (
        <div className="web-toolbar-middle">
          <SavedFlows />
          <HistoryButtons />
        </div>
      )}
      <div className="web-toolbar-end">
        {isEditor && (
          <>
            <EngineSelector {...engine} />
            <ShareMenu />
            <RunButton />
          </>
        )}
        {children}
        <AccountButton />
      </div>
    </header>
  );
}
