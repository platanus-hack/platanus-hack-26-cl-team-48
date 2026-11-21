import { SavedFlows } from "../library/SavedFlows.tsx";
import type { ReactNode } from "react";
import { MESSAGES } from "../messages.ts";
import { EngineSelector, type EngineSelectorProps } from "./EngineSelector.tsx";
import { FlowFileActions } from "./FlowFileActions.tsx";
import { HistoryButtons } from "./HistoryButtons.tsx";
import { RunButton } from "./RunButton.tsx";

type ToolbarProps = EngineSelectorProps & {
  /** The middle island, between the engine and the flow's actions. */
  readonly center?: ReactNode;
  /** Workspace controls placed after the file actions, such as the theme. */
  readonly children?: ReactNode;
};

/** Three floating islands over the canvas: the engine, the preview location and the flow actions. */
export function Toolbar({ center, children, ...engine }: ToolbarProps) {
  return (
    <header className="web-toolbar" aria-label={MESSAGES.toolbar.label} data-canvas-inset="top">
      <div className="web-island">
        <h1 className="web-brand">{MESSAGES.app.title}</h1>
        <span className="web-divider" aria-hidden="true" />
        <EngineSelector {...engine} />
      </div>
      <span className="web-toolbar-spacer" />
      {center !== undefined && <div className="web-island">{center}</div>}
      <span className="web-toolbar-spacer" />
      <div className="web-island">
        <SavedFlows />
        <HistoryButtons />
        <span className="web-divider" aria-hidden="true" />
        <div className="web-toolbar-group">
          <FlowFileActions />
          {children}
        </div>
        <RunButton />
      </div>
    </header>
  );
}
