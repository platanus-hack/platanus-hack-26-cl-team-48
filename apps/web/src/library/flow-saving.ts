import type { Flow, NodeManifest } from "@nodomics/protocol";
import type { AppStores } from "../app-stores.ts";
import { createFlowSync, type Timers } from "../engine/flow-sync.ts";
import { MESSAGES } from "../messages.ts";
import { nodeFromFlow } from "./flow-node.ts";
import { nextNodeVersion } from "./node-version.ts";
import type { SavedFlow } from "./flow-library.ts";

export const AUTO_SAVE_DELAY_MS = 1000;
type SavingDeps = {
  readonly stores: AppStores;
  readonly timers: Timers;
  readonly createId: () => string;
  readonly now: () => number;
};
type FlowSync = ReturnType<typeof createFlowSync>;

export function startFlowSaving(deps: SavingDeps) {
  const sync = createSavingSync(deps);
  const unsubscribe = subscribeSaving(deps.stores, sync);
  deps.stores.savedFlowStore.setState({
    flushPending: async () => {
      await sync.flush();
    },
  });
  return {
    flush: sync.flush,
    close: () => {
      unsubscribe();
      deps.stores.savedFlowStore.setState({ flushPending: () => Promise.resolve() });
      sync.cancel();
    },
  };
}

function createSavingSync(deps: SavingDeps): FlowSync {
  return createFlowSync({
    delayMs: AUTO_SAVE_DELAY_MS,
    timers: deps.timers,
    submit: async (_rev, flow) => {
      await saveFlow(deps, flow);
    },
    onError: () => {
      deps.stores.savedFlowStore.getState().report({ value: undefined, issue: "unavailable" });
    },
  });
}

async function saveFlow(deps: SavingDeps, flow: Flow) {
  if (flow.nodes.length === 0) return;
  const store = deps.stores.savedFlowStore;
  const { currentId, generation, files, library, report } = store.getState();
  const id = currentId ?? deps.createId();
  store.setState({ currentId: id });
  const previous = report(await library.readFlow(id));
  const node = savedNode({ id, flow, previous: previous?.node }, savingCatalog(deps.stores, flow));
  const result = await library.saveFlow(
    savedFlowRecord({ id, flow, files, node, updatedAt: deps.now() }),
  );
  report(result);
  if (store.getState().generation !== generation) return;
  store.setState({ status: result.issue === "unavailable" ? "unavailable" : "saved" });
  await store.getState().refresh();
}

function savedFlowRecord({
  id,
  flow,
  files,
  node,
  updatedAt,
}: Omit<SavedFlow, "name" | "node"> & { readonly node: SavedFlow["node"] }): SavedFlow {
  return {
    id,
    name: flow.name || MESSAGES.app.untitledFlow,
    flow,
    files,
    updatedAt,
    ...(node === undefined ? {} : { node }),
  };
}

function savedNode(
  saved: { readonly id: string; readonly flow: Flow; readonly previous: SavedFlow["node"] },
  catalog: ReadonlyArray<NodeManifest>,
): SavedFlow["node"] {
  const result = nodeFromFlow(
    { id: saved.id, flow: saved.flow, version: saved.previous?.version ?? "0.1.0" },
    catalog,
  );
  if (!result.ok) return undefined;
  const version = nextNodeVersion(saved.previous, result.value);
  return { ...version, manifest: { ...result.value, version: version.version } };
}

function savingCatalog(stores: AppStores, flow: Flow): ReadonlyArray<NodeManifest> {
  return [
    ...new Map(
      [
        ...stores.engineStore.getState().state.catalog,
        ...stores.personalLibraryStore.getState().nodes,
        ...(flow.customNodes ?? []),
      ].map((manifest) => [manifest.id, manifest]),
    ).values(),
  ];
}

function subscribeSaving(stores: AppStores, sync: FlowSync) {
  const unsubscribeSaved = stores.savedFlowStore.subscribe((state, previous) => {
    if (state.generation !== previous.generation) sync.cancel();
  });
  const unsubscribeFlow = stores.flowStore.subscribe(({ state }, previous) => {
    if (state.rev === previous.state.rev) return;
    sync.cancel();
    if (stores.savedFlowStore.getState().isOpening) return;
    markPending(stores, state.flow);
    if (state.flow.nodes.length > 0) sync.schedule(state.rev, state.flow);
  });
  return () => {
    unsubscribeSaved();
    unsubscribeFlow();
  };
}

function markPending(stores: AppStores, flow: Flow) {
  if (stores.savedFlowStore.getState().status !== "unavailable")
    stores.savedFlowStore.setState({ status: flow.nodes.length === 0 ? "unsaved" : "saving" });
}
