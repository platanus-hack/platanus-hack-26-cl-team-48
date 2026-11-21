import { useSourceReconnection } from "./engine/use-source-reconnection.ts";
import { ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";
import { Canvas } from "./canvas/Canvas.tsx";
import { useAddNode } from "./canvas/use-add-node.ts";
import { EngineConnectionContext } from "./engine/engine-connection.ts";
import type { EngineEntry } from "./engine/engine-entry.ts";
import { useEngineLifecycle } from "./engine/use-engine-lifecycle.ts";
import { LibraryPanel } from "./library/LibraryPanel.tsx";
import { NoticeArea } from "./NoticeArea.tsx";
import { CodeEditorSizeContext } from "./layout/code-editor-size.ts";
import { ParamsPanel } from "./params/ParamsPanel.tsx";
import { PreviewPanel } from "./preview/PreviewPanel.tsx";
import { Toolbar } from "./toolbar/Toolbar.tsx";
import { HubLayer } from "./hub/HubLayer.tsx";
import { useRoute } from "./routing/use-route.ts";
import { useRunOnConnect } from "./engine/use-run-on-connect.ts";

import { useAppStores } from "./app-context.ts";
import { CanvasZoom } from "./layout/CanvasZoom.tsx";
import { PreviewLocationContext, type PreviewLocationControls } from "./layout/preview-location.ts";
import { PreviewFrame } from "./layout/PreviewFrame.tsx";
import { useWorkspacePreferences } from "./layout/use-workspace-preferences.ts";
import { useViewportSize } from "./layout/viewport-size.ts";
import type {
  PreviewLocation,
  WorkspacePreferences,
  WorkspacePreferenceStorage,
} from "./layout/workspace-preferences.ts";
import type { CSSProperties } from "react";
import { ThemeControl } from "./theme/ThemeControl.tsx";
import { PreviewLocationControl } from "./toolbar/PreviewLocationControl.tsx";

export type AppProps = {
  readonly preferenceStorage: WorkspacePreferenceStorage;
  readonly engines: ReadonlyArray<EngineEntry>;
  readonly defaultEngine: EngineEntry;
  /** A shared flow opens already run, as its author saw it. */
  readonly shouldRunOnConnect: boolean;
};

export function App({ engines, defaultEngine, shouldRunOnConnect, preferenceStorage }: AppProps) {
  const [engine, setEngine] = useState(defaultEngine);
  const connection = useEngineLifecycle(engine);
  return (
    <EngineConnectionContext value={connection}>
      <ReactFlowProvider>
        <Workspace
          preferenceStorage={preferenceStorage}
          engines={engines}
          engine={engine}
          onEngineChange={setEngine}
        />
        <AutoRun isEnabled={shouldRunOnConnect} />
        <NoticeArea />
      </ReactFlowProvider>
    </EngineConnectionContext>
  );
}

function Workspace(props: {
  readonly preferenceStorage: WorkspacePreferenceStorage;
  readonly engines: ReadonlyArray<EngineEntry>;
  readonly engine: EngineEntry;
  readonly onEngineChange: (engine: EngineEntry) => void;
}) {
  const { preferenceStorage, ...engine } = props;
  const addNode = useAddNode();
  const { preferences, setPreferences } = useWorkspacePreferences(preferenceStorage);
  const viewport = useViewportSize();
  const change = (patch: Partial<WorkspacePreferences>) => {
    setPreferences({ ...preferences, ...patch });
  };
  const location = usePreviewLocationControls(preferences.previewLocation, (previewLocation) => {
    change({ previewLocation });
  });
  return (
    <PreviewLocationContext value={location}>
      <div
        className="web-app"
        data-canvas-frame
        data-library-open={preferences.isLibraryOpen}
        data-params-open={preferences.isParamsOpen}
        data-preview-location={preferences.previewLocation}
        data-preview-mode={preferences.preview.mode}
        data-viewport={viewport}
        style={workspaceSizes(preferences)}
      >
        <Canvas />
        <Toolbar {...engine}>
          <ThemeControl
            theme={preferences.theme}
            onChange={(theme) => {
              change({ theme });
            }}
          />
        </Toolbar>
        <LibraryPanel
          isOpen={preferences.isLibraryOpen}
          onToggle={() => {
            change({ isLibraryOpen: !preferences.isLibraryOpen });
          }}
          onAdd={(manifest) => {
            addNode(manifest);
          }}
        />
        {preferences.previewLocation === "panel" && (
          <PreviewFrame
            size={preferences.preview}
            onChange={(preview) => {
              change({ preview });
            }}
          >
            {(actions) => <PreviewPanel actions={actions} />}
          </PreviewFrame>
        )}
        <CodeEditorSizeContext
          value={{
            rows: preferences.codeEditorRows,
            onResize: (codeEditorRows) => {
              change({ codeEditorRows });
            },
          }}
        >
          <ParamsPanel
            isOpen={preferences.isParamsOpen}
            onToggle={() => {
              change({ isParamsOpen: !preferences.isParamsOpen });
            }}
            width={preferences.paramsWidth}
            onResize={(paramsWidth) => {
              change({ paramsWidth });
            }}
          />
        </CodeEditorSizeContext>
        <div className="web-canvas-controls">
          <CanvasZoom />
          <div className="web-floating web-preview-location">
            <PreviewLocationControl
              location={preferences.previewLocation}
              onChange={(previewLocation) => {
                change({ previewLocation });
              }}
            />
          </div>
        </div>
        <HubOverlay />
      </div>
    </PreviewLocationContext>
  );
}

/** "Abrir tabla" in a node moves the preview to the panel, showing that node. */
function usePreviewLocationControls(
  location: PreviewLocation,
  onChange: (location: PreviewLocation) => void,
): PreviewLocationControls {
  const { selectionStore } = useAppStores();
  return {
    location,
    openInPanel: (nodeId) => {
      selectionStore.getState().select([nodeId]);
      onChange("panel");
    },
  };
}

const workspaceSizes = (
  preferences: WorkspacePreferences,
): CSSProperties & {
  readonly "--preview-chosen-height": string;
  readonly "--params-scale": number;
} => ({
  "--preview-chosen-height": `${String(preferences.preview.height)}%`,
  "--params-scale": preferences.paramsWidth,
});

function AutoRun({ isEnabled }: { readonly isEnabled: boolean }) {
  useSourceReconnection();
  useRunOnConnect(isEnabled);
  return null;
}

/** The hub's pages cover the editor, which stays mounted so its flow and engine survive. */
function HubOverlay() {
  const route = useRoute();
  return route.page === "workspace" ? null : <HubLayer route={route} />;
}
