import { createSecretStore } from "./library/secret-store.ts";
import { createMemoryFlowLibrary } from "./library/memory-flow-library.ts";
import type { FlowLibrary } from "./library/flow-library.ts";
import { createSavedFlowStore } from "./library/saved-flow-store.ts";
import type { Flow } from "@nodomics/protocol";
import type { NoticeProps } from "@nodomics/ui";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { EngineEvent } from "./engine/engine-events.ts";
import { applyEvent, createEngineState, type EngineState } from "./engine/engine-state.ts";
import {
  applyCommand,
  createFlowState,
  type Command,
  type FlowState,
} from "./flow/flow-commands.ts";
import { createMemoryPersonalLibrary } from "./library/memory-personal-library.ts";
import type { PersonalLibrary } from "./library/personal-library.ts";
import { createPersonalLibraryStore } from "./library/personal-library-store.ts";

export type FlowStore = StoreApi<{
  readonly state: FlowState;
  readonly dispatch: (command: Command) => void;
}>;

export type EngineStore = StoreApi<{
  readonly state: EngineState;
  readonly dispatch: (event: EngineEvent) => void;
}>;

export type SelectionStore = StoreApi<{
  readonly selectedIds: ReadonlyArray<string>;
  readonly select: (ids: ReadonlyArray<string>) => void;
}>;

export type AppNotice = Pick<NoticeProps, "tone" | "title" | "detail">;

export type NoticeStore = StoreApi<{
  readonly notice: AppNotice | undefined;
  readonly show: (notice: AppNotice) => void;
  readonly dismiss: () => void;
}>;

export type AppStores = {
  readonly secretStore: ReturnType<typeof createSecretStore>;
  readonly savedFlowStore: ReturnType<typeof createSavedFlowStore>;
  readonly flowStore: FlowStore;
  readonly engineStore: EngineStore;
  readonly selectionStore: SelectionStore;
  readonly noticeStore: NoticeStore;
  readonly personalLibraryStore: ReturnType<typeof createPersonalLibraryStore>;
};

/** The stores of one app instance, created once and handed down by context (no singletons). */
export function createAppStores(
  initialFlow?: Flow,
  personalLibrary: PersonalLibrary = createMemoryPersonalLibrary(),
  flowLibrary: FlowLibrary = createMemoryFlowLibrary(),
): AppStores {
  const noticeStore = createNoticeStore();
  const flowStore = createStore<ReturnType<FlowStore["getState"]>>((set) => ({
    state: createFlowState(initialFlow),
    dispatch: (command) => {
      const apply = () => {
        if (command.type === "flow.load") savedFlowStore.getState().resetForLoad();
        set(({ state }) => ({ state: applyCommand(state, command) }));
      };
      if (command.type === "flow.load" && savedFlowStore.getState().status === "saving")
        void flushBeforeLoad(savedFlowStore, apply);
      else apply();
    },
  }));
  const savedFlowStore = createSavedFlowStore({
    library: flowLibrary,
    dispatch: flowStore.getState().dispatch,
    show: (notice) => {
      noticeStore.getState().show(notice);
    },
  });
  const selectionStore = createSelectionStore();
  keepSelectionInFlow(flowStore, selectionStore);
  return {
    savedFlowStore,
    secretStore: createSecretStore({
      library: flowLibrary,
      report: savedFlowStore.getState().report,
    }),
    noticeStore,
    personalLibraryStore: createPersonalLibraryStore(personalLibrary, noticeStore.getState().show),
    flowStore,
    engineStore: createStore((set) => ({
      state: createEngineState(),
      dispatch: (event) => {
        set(({ state }) => ({ state: applyEvent(state, event) }));
      },
    })),
    selectionStore,
  };
}

function createSelectionStore(): SelectionStore {
  return createStore((set) => ({
    selectedIds: [],
    select: (selectedIds) => {
      set({ selectedIds });
    },
  }));
}

/** Nodes that leave the flow, as when another flow opens, leave the selection too. */
function keepSelectionInFlow(flowStore: FlowStore, selectionStore: SelectionStore) {
  flowStore.subscribe(({ state }) => {
    const { selectedIds, select } = selectionStore.getState();
    const kept = selectedIds.filter((id) => state.flow.nodes.some((node) => node.id === id));
    if (kept.length < selectedIds.length) select(kept);
  });
}

function createNoticeStore(): NoticeStore {
  return createStore((set) => ({
    notice: undefined,
    show: (notice) => {
      set({ notice });
    },
    dismiss: () => {
      set({ notice: undefined });
    },
  }));
}

async function flushBeforeLoad(store: AppStores["savedFlowStore"], apply: () => void) {
  try {
    await store.getState().flushPending();
    apply();
  } catch {
    store.getState().report({ value: undefined, issue: "unavailable" });
  }
}
