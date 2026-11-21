import { AccountButton } from "../hub/AccountButton.tsx";
import { MESSAGES } from "../messages.ts";
import { EngineSelector, type EngineSelectorProps } from "./EngineSelector.tsx";
import { FlowName } from "./FlowName.tsx";
import { FlowOptionsMenu } from "./FlowOptionsMenu.tsx";
import { HistoryButtons } from "./HistoryButtons.tsx";
import { RunButton } from "./RunButton.tsx";
import { ShareMenu } from "./ShareMenu.tsx";

/** The editor's bar: the open flow and its history on the left, where and how it runs on the right. */
export function Toolbar(engine: EngineSelectorProps) {
  return (
    <header className="web-toolbar" aria-label={MESSAGES.toolbar.label} data-canvas-inset="top">
      <div className="web-toolbar-start">
        <h1 className="web-brand">
          <span className="web-brand-mark" aria-hidden="true" />
          {MESSAGES.app.title}
        </h1>
        <span className="web-toolbar-divider" aria-hidden="true" />
        <FlowName />
        <FlowOptionsMenu />
        <HistoryButtons />
      </div>
      <div className="web-toolbar-end">
        <EngineSelector {...engine} />
        <ShareMenu />
        <RunButton />
        <AccountButton />
      </div>
    </header>
  );
}
