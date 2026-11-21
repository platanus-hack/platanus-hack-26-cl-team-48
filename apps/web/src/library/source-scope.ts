import type { StoreApi } from "zustand/vanilla";
import type { SavedFlowState } from "./saved-flow-store.ts";

export function captureSourceScope(store: StoreApi<SavedFlowState>): () => boolean {
  const { generation, sessionEpoch } = store.getState();
  return () =>
    store.getState().generation === generation && store.getState().sessionEpoch === sessionEpoch;
}
