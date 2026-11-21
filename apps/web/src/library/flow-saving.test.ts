import type { FlowStore } from "@nodomics/hub";
import { expect, it, vi } from "vitest";
import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { createAppStores } from "../app-stores.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { startFlowSaving, AUTO_SAVE_DELAY_MS } from "./flow-saving.ts";
import { cloudStores, createFlowsHub, signedInHub } from "./cloud-flow-fixtures.ts";

const flow: Flow = {
  format: FLOW_FORMAT,
  name: "Ventas",
  nodes: [{ version: "0.1.0", id: "one", type: "sample", params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};
function setup() {
  const library = createMemoryFlowLibrary();
  const stores = createAppStores(undefined, createMemoryPersonalLibrary(), library);
  const callbacks = new Map<number, () => void>();
  let next = 0;
  const timers = {
    set: (fn: () => void, delay: number) => {
      expect(delay).toBe(AUTO_SAVE_DELAY_MS);
      callbacks.set(++next, fn);
      return next;
    },
    clear: (id: number) => {
      callbacks.delete(id);
    },
  };
  const saving = startFlowSaving({ stores, timers, createId: () => "flow_test", now: () => 42 });
  return { stores, library, callbacks, saving };
}
it("debounces edits, skips empty flows and persists source references", async () => {
  const { stores, library, callbacks, saving } = setup();
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Vacío" });
  await saving.flush();
  expect((await library.listFlows()).value).toEqual([]);
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });
  stores.savedFlowStore.getState().trackSource("source", "file");
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Final" });
  expect(callbacks.size).toBe(1);
  await saving.flush();
  expect((await library.readFlow("flow_test")).value).toMatchObject({
    name: "Final",
    updatedAt: 42,
    files: { source: "file" },
  });
  expect(stores.savedFlowStore.getState().status).toBe("saved");
  saving.close();
  expect(callbacks.size).toBe(0);
});
it("restores the most recent flow and leaves shared flows without identity", async () => {
  const { stores, library, saving } = setup();
  await library.saveFlow({ id: "old", name: "Ventas", flow, files: {}, updatedAt: 1 });
  await stores.savedFlowStore.getState().initialize(false);
  expect(stores.flowStore.getState().state.flow).toEqual(flow);
  expect(stores.savedFlowStore.getState().currentId).toBe("old");
  await stores.savedFlowStore.getState().initialize(true);
  expect(stores.savedFlowStore.getState().currentId).toBeUndefined();
  saving.close();
});
it("does not autosave merely opening a saved flow and creates a new identity after import", async () => {
  const { stores, library, saving } = setup();
  await library.saveFlow({ id: "old", name: "Ventas", flow, files: {}, updatedAt: 1 });
  await stores.savedFlowStore.getState().openFlow("old");
  await saving.flush();
  expect((await library.readFlow("old")).value?.updatedAt).toBe(1);
  stores.flowStore.getState().dispatch({ type: "flow.load", flow: { ...flow, name: "Importado" } });
  await saving.flush();
  expect(stores.savedFlowStore.getState().currentId).toBe("flow_test");
  expect((await library.readFlow("old")).value?.name).toBe("Ventas");
  saving.close();
});
it("keeps unavailable status and only reports storage failure once", async () => {
  const { createIdbFlowLibrary } = await import("./idb-flow-library.ts");
  const stores = createAppStores(
    undefined,
    createMemoryPersonalLibrary(),
    createIdbFlowLibrary(() => undefined),
  );
  const show = vi.fn();
  stores.noticeStore.setState({ show });
  await stores.savedFlowStore.getState().initialize(false);
  await stores.savedFlowStore.getState().refresh();
  expect(stores.savedFlowStore.getState().status).toBe("unavailable");
  expect(show).toHaveBeenCalledTimes(1);
});

it("flushes pending edits before creating a new flow", async () => {
  const { stores, library, saving } = setup();
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });
  await stores.savedFlowStore.getState().newFlow();
  expect((await library.readFlow("flow_test")).value?.name).toBe("Ventas");
  expect(stores.savedFlowStore.getState().currentId).toBeUndefined();
  saving.close();
});
it("does not resurrect a deleted flow from its pending autosave", async () => {
  const { stores, library, saving } = setup();
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });
  await saving.flush();
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Borrado" });
  await stores.savedFlowStore.getState().remove("flow_test");
  await saving.flush();
  expect((await library.listFlows()).value).toHaveLength(0);
  saving.close();
});

it("leaves a shared flow untouched until its first edit and keeps the original saved flow", async () => {
  const library = createMemoryFlowLibrary();
  await library.saveFlow({ id: "original", name: "Original", flow, files: {}, updatedAt: 1 });
  const stores = createAppStores(
    { ...flow, name: "Compartido" },
    createMemoryPersonalLibrary(),
    library,
  );
  await stores.savedFlowStore.getState().initialize(true);
  const callbacks: Array<() => void> = [];
  const saving = startFlowSaving({
    stores,
    timers: {
      set: (fn) => {
        callbacks.push(fn);
        return callbacks.length;
      },
      clear: () => undefined,
    },
    createId: () => "flow_shared",
    now: () => 2,
  });
  await saving.flush();
  expect((await library.listFlows()).value).toHaveLength(1);
  expect(stores.flowStore.getState().state.flow.name).toBe("Compartido");
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Mi copia" });
  await saving.flush();
  expect((await library.readFlow("flow_shared")).value?.name).toBe("Mi copia");
  expect((await library.readFlow("original")).value?.name).toBe("Original");
  saving.close();
});

it("reconnects a saved source when its id belongs to a different file in the current engine", async () => {
  const { stores, library, saving } = setup();
  stores.savedFlowStore.getState().trackSource("same-id", "other-file");
  await library.saveFlow({
    id: "second",
    name: "Segundo",
    flow,
    files: { "same-id": "wanted-file" },
    updatedAt: 1,
  });
  await stores.savedFlowStore.getState().openFlow("second");
  expect(stores.savedFlowStore.getState().sessionSources.has("same-id")).toBe(false);
  saving.close();
});

it("flushes the previous identity before importing a flow", async () => {
  const { stores, library, saving } = setup();
  await library.saveFlow({ id: "old", name: "Ventas", flow, files: {}, updatedAt: 1 });
  await stores.savedFlowStore.getState().openFlow("old");
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Pendiente" });
  stores.flowStore.getState().dispatch({ type: "flow.load", flow: { ...flow, name: "Importado" } });
  await saving.flush();
  expect((await library.readFlow("old")).value?.name).toBe("Pendiente");
  saving.close();
});
it("never reuses session sources for an imported flow without file associations", () => {
  const { stores, saving } = setup();
  stores.savedFlowStore.getState().trackSource("source_1", "file-a");
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });
  expect(stores.savedFlowStore.getState().sessionSources.has("source_1")).toBe(false);
  saving.close();
});

function cloudSetup(hub: FlowStore) {
  const { stores, library } = cloudStores(hub);
  const show = vi.fn();
  stores.noticeStore.setState({ show });
  const saving = startFlowSaving({
    stores,
    timers: { set: () => 0, clear: () => undefined },
    createId: () => "flow_test",
    now: () => 42,
  });
  return { stores, library, saving, show };
}

it("saves the current flow right away as a new saved flow", async () => {
  const { stores, library, saving } = cloudSetup(await signedInHub());
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });

  await saving.saveCurrent();

  expect({
    saved: (await library.readFlow("flow_test")).value?.name,
    currentId: stores.savedFlowStore.getState().currentId,
    status: stores.savedFlowStore.getState().status,
  }).toEqual({ saved: "Ventas", currentId: "flow_test", status: "saved" });
  saving.close();
});

it("does not save an empty current flow", async () => {
  const { library, saving } = cloudSetup(await signedInHub());

  await saving.saveCurrent();

  expect((await library.listFlows()).value).toEqual([]);
  saving.close();
});

it("saves the current flow into its existing saved flow", async () => {
  const { stores, library, saving } = cloudSetup(await signedInHub());
  await library.saveFlow({ id: "old", name: "Ventas", flow, files: {}, updatedAt: 1 });
  await stores.savedFlowStore.getState().openFlow("old");
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Renombrado" });

  await saving.saveCurrent();

  expect((await library.listFlows()).value.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: "old", name: "Renombrado" },
  ]);
  saving.close();
});

it("leaves the signed-out status when a save comes back signed out", async () => {
  const { stores, saving, show } = cloudSetup(createFlowsHub());
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });

  await saving.flush();

  expect({
    status: stores.savedFlowStore.getState().status,
    notices: show.mock.calls.length,
  }).toEqual({ status: "signed-out", notices: 0 });
  saving.close();
});

it("does not show saving while signed out and editing", async () => {
  const { stores, saving } = cloudSetup(createFlowsHub());
  await stores.savedFlowStore.getState().refresh();
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });

  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Editado" });

  expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  saving.close();
});

it("keeps a public flow public when an edit is autosaved", async () => {
  const { stores, library, saving } = cloudSetup(await signedInHub());
  await library.saveFlow({
    id: "old",
    name: "Ventas",
    flow,
    files: {},
    updatedAt: 1,
    visibility: "public",
  });
  await stores.savedFlowStore.getState().openFlow("old");
  stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Editado" });

  await saving.flush();

  expect((await library.readFlow("old")).value).toMatchObject({
    name: "Editado",
    visibility: "public",
  });
  saving.close();
});
