import { createIdbFlowLibrary } from "./library/idb-flow-library.ts";
import { startFlowSaving } from "./library/flow-saving.ts";
import { createCloudFlowLibrary } from "./library/cloud-flow-library.ts";
import { followFlowSession } from "./library/follow-flow-session.ts";
import { keepPendingFlow, takePendingFlow } from "./library/pending-flow.ts";
import "@nodomics/ui/tokens.css";
import "@nodomics/ui/fonts.css";
import "@nodomics/ui/components.css";
import "@xyflow/react/dist/base.css";
import "./app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AppStoresContext } from "./app-context.ts";
import { createAppStores } from "./app-stores.ts";
import { ENGINES } from "./engine-registry.ts";
import { decodeSharedFlow, encodeSharedFlow } from "./flow/flow-file.ts";
import { describeFlowFileError } from "./flow/use-flow-files.ts";
import {
  createStorageWorkspacePreferences,
  readPreferences,
} from "./layout/storage-workspace-preferences.ts";
import { MESSAGES } from "./messages.ts";
import { createAppFeed } from "./feed/create-app-feed.ts";
import { FeedContext } from "./feed/feed-context.ts";
import { createAppHub } from "./hub/create-app-hub.ts";
import { HubContext } from "./hub/hub-context.ts";
import { HubApp } from "./hub/HubApp.tsx";
import {
  createStoragePersonalLibrary,
  PERSONAL_NODES_KEY,
} from "./library/storage-personal-library.ts";
import {
  editorOpeningOf,
  editorUrl,
  pathOf,
  routeOfLocation,
  type EditorOpening,
} from "./routing/routes.ts";
import type { Flow } from "@nodomics/protocol";
import { applyTheme } from "./theme/ThemeControl.tsx";
import { followStoredTheme } from "./theme/theme-sync.ts";

// Composition root: the one place that reads the URL, creates the stores and picks the engines.
const shared = decodeSharedFlow(window.location.hash);
// The hub is the home page (ADR 0024); the editor owns the open flow and saves it.
const isHubTab = routeOfLocation(window.location).page !== "workspace";
const opening = editorOpeningOf(window.location.search);
// What was left unsaved before signing in with a provider, which navigates away (ADR 0023).
const pending = isHubTab ? undefined : takePendingFlow(window.sessionStorage);
const hub = createAppHub(import.meta.env);
const stores = createAppStores(
  shared?.ok === true ? shared.value : pending,
  createStoragePersonalLibrary(() => window.localStorage),
  createCloudFlowLibrary({ flows: hub, local: createIdbFlowLibrary(() => window.indexedDB) }),
);
if (shared?.ok === false)
  stores.noticeStore.getState().show({
    tone: "error",
    title: MESSAGES.files.sharedFailed,
    detail: describeFlowFileError(shared.error),
  });

// Mis nodos changes in the hub tab, and the editor tab must see it.
window.addEventListener("storage", (event) => {
  if (event.key === PERSONAL_NODES_KEY) stores.personalLibraryStore.getState().reload();
});

if (!isHubTab) await startEditorFlow();

async function startEditorFlow() {
  const profile = await hub.currentProfile();
  const hasGivenFlow = shared !== undefined || pending !== undefined;
  await stores.savedFlowStore.getState().initialize({ opening, hasGivenFlow });
  // Once open, a reload resumes it as the latest flow; an old `/#flow=` link moves to the editor.
  window.history.replaceState(null, "", `${editorUrl({ kind: "latest" })}${window.location.hash}`);
  const saving = startFlowSaving({
    stores,
    timers: {
      set: (callback, delay) => window.setTimeout(callback, delay),
      clear: (id) => {
        window.clearTimeout(id);
      },
    },
    createId: () => `flow_${crypto.randomUUID()}`,
    now: Date.now,
  });
  followFlowSession({ hub, stores, saving, initialProfileId: profile?.id });
  keepUnsavedFlowOnLeave();
  if (pending !== undefined && profile !== undefined) await saving.saveCurrent();
}

function keepUnsavedFlowOnLeave() {
  window.addEventListener("pagehide", () => {
    const { flow } = stores.flowStore.getState().state;
    const isUnsaved = stores.savedFlowStore.getState().status === "signed-out";
    if (isUnsaved && flow.nodes.length > 0) keepPendingFlow(window.sessionStorage, flow);
  });
}

// Leaving the hub for the editor is a page load: each page builds what it needs.
function openEditor(next: EditorOpening) {
  window.location.assign(editorUrl(next));
}

function openCopy(flow: Flow) {
  window.location.assign(`${pathOf({ page: "workspace" })}${encodeSharedFlow(flow)}`);
}

// The hub port does not expose the Supabase access token yet, so the agent service sees no session.
const getNoAccessTokenYet = () => Promise.resolve(undefined);
const feed = createAppFeed(import.meta.env, {
  getAccessToken: getNoAccessTokenYet,
  currentHandle: async () => (await hub.currentProfile())?.handle,
});

const preferenceStorage = createStorageWorkspacePreferences(() => window.localStorage);
// The editor's theme menu applies it there; the hub tab follows the theme chosen in the editor.
if (isHubTab) {
  const readTheme = () => readPreferences(() => window.localStorage).theme;
  applyTheme(readTheme());
  followStoredTheme(window, readTheme, applyTheme);
}

const [defaultEngine] = ENGINES;
const root = document.getElementById("root");
if (defaultEngine === undefined || root === null)
  throw new Error("The app needs a #root element and at least one engine");

createRoot(root).render(
  <StrictMode>
    <AppStoresContext value={stores}>
      <HubContext value={hub}>
        <FeedContext value={feed}>
          {isHubTab ? (
            <HubApp onOpenEditor={openEditor} onOpenCopy={openCopy} />
          ) : (
            <App
              preferenceStorage={preferenceStorage}
              engines={ENGINES}
              defaultEngine={defaultEngine}
              shouldRunOnConnect={shared?.ok === true}
            />
          )}
        </FeedContext>
      </HubContext>
    </AppStoresContext>
  </StrictMode>,
);
