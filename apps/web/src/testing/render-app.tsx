import type { Hub } from "@nodomics/hub";
import { App } from "../App.tsx";
import { createAppStores, type AppStores } from "../app-stores.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import { HubContext } from "../hub/hub-context.ts";
import { createTestHub } from "../hub/hub-pages-fixtures.tsx";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  type WorkspacePreferences,
  type WorkspacePreferenceStorage,
} from "../layout/workspace-preferences.ts";
import { startFakeEngine, type FakeHandlers } from "./fake-engine.ts";
import { renderWithStores } from "./render-with-stores.tsx";

/** Workspace preferences kept in memory, with every write recorded. */
export function createMemoryPreferences(initial: Partial<WorkspacePreferences> = {}) {
  let current: WorkspacePreferences = { ...DEFAULT_WORKSPACE_PREFERENCES, ...initial };
  const writes: WorkspacePreferences[] = [];
  const storage: WorkspacePreferenceStorage = {
    read: () => current,
    write: (preferences) => {
      current = preferences;
      writes.push(preferences);
    },
  };
  return { storage, writes, current: () => current };
}

type RenderAppOptions = {
  readonly path?: string;
  readonly stores?: AppStores;
  readonly hub?: Hub;
  readonly handlers?: FakeHandlers;
  readonly preferences?: Partial<WorkspacePreferences>;
};

/** Renders the whole editor connected to a fake engine, as main.tsx composes it. */
export function renderApp(options: RenderAppOptions = {}) {
  window.history.replaceState(null, "", options.path ?? "/");
  const engine: EngineEntry = {
    id: "fake",
    label: "Simulado",
    badge: "browser",
    connect: () => startFakeEngine(options.handlers).transport,
  };
  const preferences = createMemoryPreferences(options.preferences);
  const rendered = renderWithStores(
    <HubContext value={options.hub ?? createTestHub()}>
      <App
        engines={[engine]}
        defaultEngine={engine}
        shouldRunOnConnect={false}
        preferenceStorage={preferences.storage}
      />
    </HubContext>,
    options.stores ?? createAppStores(),
  );
  return { preferences, ...rendered };
}
