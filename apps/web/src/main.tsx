import { createIdbFlowLibrary } from "./library/idb-flow-library.ts";
import { startFlowSaving } from "./library/flow-saving.ts";
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
import { decodeSharedFlow } from "./flow/flow-file.ts";
import { describeFlowFileError } from "./flow/use-flow-files.ts";
import { createStoragePersonalLibrary } from "./library/storage-personal-library.ts";
import { createStorageWorkspacePreferences } from "./layout/storage-workspace-preferences.ts";
import { MESSAGES } from "./messages.ts";

// Composition root: the one place that reads the URL, creates the stores and picks the engines.
const shared = decodeSharedFlow(window.location.hash);
const stores = createAppStores(
  shared?.ok === true ? shared.value : undefined,
  createStoragePersonalLibrary(() => window.localStorage),
  createIdbFlowLibrary(() => window.indexedDB),
);
if (shared?.ok === false)
  stores.noticeStore.getState().show({
    tone: "error",
    title: MESSAGES.files.sharedFailed,
    detail: describeFlowFileError(shared.error),
  });

await stores.savedFlowStore.getState().initialize(shared !== undefined);
startFlowSaving({
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

const preferenceStorage = createStorageWorkspacePreferences(() => window.localStorage);

const [defaultEngine] = ENGINES;
const root = document.getElementById("root");
if (defaultEngine === undefined || root === null)
  throw new Error("The app needs a #root element and at least one engine");

createRoot(root).render(
  <StrictMode>
    <AppStoresContext value={stores}>
      <App
        preferenceStorage={preferenceStorage}
        engines={ENGINES}
        defaultEngine={defaultEngine}
        shouldRunOnConnect={shared?.ok === true}
      />
    </AppStoresContext>
  </StrictMode>,
);
