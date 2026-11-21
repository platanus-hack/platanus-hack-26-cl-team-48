import type { ReactNode } from "react";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { EngineConnectionContext } from "../engine/engine-connection.ts";
import { createEngineSession, type EngineSession } from "../engine/engine-session.ts";
import { startFakeEngine, type FakeHandlers } from "./fake-engine.ts";
import { renderWithStores } from "./render-with-stores.tsx";

type RenderOptions = {
  readonly handlers?: FakeHandlers;
  readonly stores?: AppStores;
  /**
   * Session methods answered without the transport. Binary answers need it: the memory transport
   * clones messages, and under jsdom the cloned bytes are not a Uint8Array of the test's realm.
   */
  readonly session?: Partial<EngineSession>;
};

/** Renders `ui` connected to a fake NEP engine answering with `handlers`. */
export function renderWithEngine(ui: ReactNode, options: RenderOptions = {}) {
  const stores = options.stores ?? createAppStores();
  const engine = startFakeEngine(options.handlers);
  const session = createEngineSession({
    engineId: "fake",
    transport: engine.transport,
    dispatch: stores.engineStore.getState().dispatch,
  });
  const connection = {
    session: { ...session, ...options.session },
    flushFlow: () => Promise.resolve(stores.flowStore.getState().state.rev),
  };
  return {
    engine,
    ...renderWithStores(
      <EngineConnectionContext value={connection}>{ui}</EngineConnectionContext>,
      stores,
    ),
  };
}
