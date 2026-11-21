import type { NodeManifest } from "@nodomics/protocol";
import { createContext, use, useMemo } from "react";
import { useStore } from "zustand";
import { personalCatalog } from "./library/personal-node-catalog.ts";
import { myNodeId } from "./library/flow-node.ts";
import type { AppStores } from "./app-stores.ts";
import type { EngineState } from "./engine/engine-state.ts";
import type { FlowState } from "./flow/flow-commands.ts";

export const AppStoresContext = createContext<AppStores | undefined>(undefined);

export function useAppStores(): AppStores {
  const stores = use(AppStoresContext);
  if (stores === undefined) throw new Error("useAppStores must be used inside AppStoresContext");
  return stores;
}

export const useFlowState = <T>(select: (state: FlowState) => T): T =>
  useStore(useAppStores().flowStore, ({ state }) => select(state));

export const useDispatch = () => useStore(useAppStores().flowStore, ({ dispatch }) => dispatch);

export const useEngineState = <T>(select: (state: EngineState) => T): T =>
  useStore(useAppStores().engineStore, ({ state }) => select(state));

export const useSelectedIds = () =>
  useStore(useAppStores().selectionStore, ({ selectedIds }) => selectedIds);

export const useShowNotice = () => useStore(useAppStores().noticeStore, ({ show }) => show);

/** The engine's catalog plus the flow's own custom nodes, which the engine may not know yet. */
export function useCatalog(): ReadonlyArray<NodeManifest> {
  const engineCatalog = useEngineState((state) => state.catalog);
  const customNodes = useFlowState((state) => state.flow.customNodes);
  const personalNodes = usePersonalNodes();
  const currentId = useStore(useAppStores().savedFlowStore, ({ currentId }) => currentId);
  return useMemo(
    () =>
      [
        ...new Map(
          [...engineCatalog, ...personalNodes, ...(customNodes ?? [])].map((manifest) => [
            manifest.id,
            manifest,
          ]),
        ).values(),
      ].filter((manifest) => manifest.id !== myNodeId(currentId ?? "")),
    [engineCatalog, personalNodes, customNodes, currentId],
  );
}

export function usePersonalNodes(): ReadonlyArray<NodeManifest> {
  const legacy = useStore(useAppStores().personalLibraryStore, ({ nodes }) => nodes);
  const saved = useStore(useAppStores().savedFlowStore, ({ flows }) => flows);
  return useMemo(() => personalCatalog({ legacy, saved }), [legacy, saved]);
}
