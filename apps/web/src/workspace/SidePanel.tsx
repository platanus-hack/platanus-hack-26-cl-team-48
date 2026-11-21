import type { NodeManifest } from "@nodomics/protocol";
import { Button } from "@nodomics/ui";
import { useEffect, type ReactNode } from "react";
import { useAppStores } from "../app-context.ts";
import { AgentPanel } from "../agent/AgentPanel.tsx";
import type { SideSection } from "../layout/workspace-preferences.ts";
import { Credentials } from "../library/Credentials.tsx";
import { LibraryPanel } from "../library/LibraryPanel.tsx";
import { SavedFlowList } from "../library/SavedFlowList.tsx";
import { SavedNodeList } from "../library/SavedNodeList.tsx";
import { StoredFileList } from "../library/StoredFileList.tsx";
import { MESSAGES } from "../messages.ts";
import "../library/saved-flows.css";

type SidePanelProps = {
  readonly section: SideSection;
  readonly onHide: () => void;
  readonly onAdd: (manifest: NodeManifest) => void;
};

// The lists were made for a dialog that closed after opening a flow; the panel stays open.

const CONTENTS: Record<SideSection, (onAdd: SidePanelProps["onAdd"]) => ReactNode> = {
  nodes: (onAdd) => <LibraryPanel onAdd={onAdd} />,
  flows: () => <SavedFlowList />,
  "my-nodes": () => <SavedNodeList />,
  data: () => <StoredFileList />,
  secrets: () => <Credentials />,
  agent: () => <AgentPanel />,
};

/** The section chosen in the activity rail, beside the canvas. */
export function SidePanel({ section, onHide, onAdd }: SidePanelProps) {
  useSavedFlowsRefresh(section);
  return (
    <aside
      className="web-side-panel"
      data-section={section}
      data-canvas-inset="left"
      aria-label={MESSAGES.rail.panels[section]}
    >
      <header className="web-side-header">
        <h2>{MESSAGES.rail.sections[section]}</h2>
        <Button
          variant="ghost"
          icon="panel-left-close"
          label={MESSAGES.rail.hidePanel}
          onClick={onHide}
        />
      </header>
      <div className="web-side-body">{CONTENTS[section](onAdd)}</div>
    </aside>
  );
}

/** Another tab may have saved flows since this one listed them. */
function useSavedFlowsRefresh(section: SideSection) {
  const { savedFlowStore } = useAppStores();
  useEffect(() => {
    void savedFlowStore.getState().refresh();
  }, [savedFlowStore, section]);
}
