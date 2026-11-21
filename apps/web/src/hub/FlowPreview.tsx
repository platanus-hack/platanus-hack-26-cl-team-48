import type { Snapshot } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";
import { AppStoresContext } from "../app-context.ts";
import { createAppStores } from "../app-stores.ts";
import { Canvas } from "../canvas/Canvas.tsx";
import { EngineConnectionContext } from "../engine/engine-connection.ts";
import { MESSAGES } from "../messages.ts";
import { PreviewPanel } from "../preview/PreviewPanel.tsx";
import { createReplaySession, snapshotEngineState } from "./snapshot-replay.ts";

const NO_REVISION = Promise.resolve(undefined);

/**
 * A published flow shown with the editor's own canvas and preview, but on stores of its own and
 * answered from its snapshot, so nothing reaches the user's flow or engine (ADR 0018, point 6).
 */
export function FlowPreview({
  flow,
  snapshot,
}: {
  readonly flow: Flow;
  readonly snapshot: Snapshot;
}) {
  const stores = useMemo(() => viewerStores(flow, snapshot), [flow, snapshot]);
  const connection = useMemo(
    () => ({ session: createReplaySession(snapshot), flushFlow: () => NO_REVISION }),
    [snapshot],
  );
  return (
    <section className="web-hub-preview" aria-label={MESSAGES.hub.preview}>
      <AppStoresContext value={stores}>
        <EngineConnectionContext value={connection}>
          <ReactFlowProvider>
            <Canvas />
            <PreviewPanel />
          </ReactFlowProvider>
        </EngineConnectionContext>
      </AppStoresContext>
    </section>
  );
}

function viewerStores(flow: Flow, snapshot: Snapshot) {
  const stores = createAppStores(flow);
  stores.engineStore.setState({ state: snapshotEngineState(snapshot) });
  return stores;
}
