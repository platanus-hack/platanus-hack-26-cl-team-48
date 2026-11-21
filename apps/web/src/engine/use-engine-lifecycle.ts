import { useEffect, useState } from "react";
import { useAppStores } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import type { EngineConnection } from "./engine-connection.ts";
import type { EngineEntry } from "./engine-entry.ts";
import type { Timers } from "./flow-sync.ts";
import { openConnection } from "./open-connection.ts";

const BROWSER_TIMERS: Timers = {
  set: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clear: (handle) => {
    window.clearTimeout(handle);
  },
};

type Connected = { readonly entry: EngineEntry; readonly connection: EngineConnection };

/** Connects to `entry` while mounted; picking another engine reconnects and resends the flow. */
export function useEngineLifecycle(entry: EngineEntry): EngineConnection | undefined {
  const { flowStore, engineStore, noticeStore, savedFlowStore, secretStore } = useAppStores();
  const [connected, setConnected] = useState<Connected | undefined>(undefined);
  useEffect(() => {
    const showSyncError = () => {
      noticeStore.getState().show({ tone: "error", title: MESSAGES.connection.syncFailed });
    };
    const unsubscribe = engineStore.subscribe(({ state }, previous) => {
      if (
        state.connection !== previous.state.connection &&
        (state.connection.status === "connected" || state.connection.status === "connecting")
      )
        savedFlowStore.getState().resetSources();
    });
    const opened = openConnection({
      entry,
      stores: { flowStore, engineStore, secretStore },
      timers: BROWSER_TIMERS,
      onError: showSyncError,
    });
    const awaitConnection = async () => {
      const connection = await opened.ready;
      if (connection !== undefined) setConnected({ entry, connection });
    };
    awaitConnection().catch(showSyncError);
    return () => {
      unsubscribe();
      opened.close();
    };
  }, [entry, flowStore, engineStore, noticeStore, savedFlowStore, secretStore]);
  return connected?.entry === entry ? connected.connection : undefined;
}
