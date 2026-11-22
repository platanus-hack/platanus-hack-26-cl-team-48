import type { FlowStore } from "@nodomics/hub";
import { expect, it, vi } from "vitest";
import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { createAppStores } from "../app-stores.ts";
import { CATALOG, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { withoutPrivateParams } from "../hub/hub-flow.ts";
import { flowFingerprint } from "./flow-fingerprint.ts";
import type { SavedFlow } from "./flow-library.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { startFlowSaving, AUTO_SAVE_DELAY_MS } from "./flow-saving.ts";
import { cloudStores, createFlowsHub, recordingFlows, signedInHub } from "./cloud-flow-fixtures.ts";

const flow: Flow = {
  format: FLOW_FORMAT,
  name: "Ventas",
  nodes: [{ version: "0.1.0", id: "one", type: "sample", params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};
const LATEST = { opening: { kind: "latest" }, hasGivenFlow: false } as const;
const GIVEN = { opening: { kind: "latest" }, hasGivenFlow: true } as const;

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
  await stores.savedFlowStore.getState().initialize(LATEST);
  expect(stores.flowStore.getState().state.flow).toEqual(flow);
  expect(stores.savedFlowStore.getState().currentId).toBe("old");
  await stores.savedFlowStore.getState().initialize(GIVEN);
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
  await stores.savedFlowStore.getState().initialize(LATEST);
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
  await stores.savedFlowStore.getState().initialize(GIVEN);
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

it("sends no visibility when an edit is autosaved", async () => {
  const { flows, drafts } = recordingFlows();
  const { stores, saving } = cloudSetup(flows);
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });

  await saving.flush();

  expect(drafts.map((draft) => ({ id: draft.id, hasVisibility: "visibility" in draft }))).toEqual([
    { id: "flow_test", hasVisibility: false },
  ]);
  saving.close();
});

const LOCAL_FILE = manifestOf("core.source.file", {
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: {
      sourceId: { type: "string", "x-nodomics": { widget: "source" } },
      delimiter: { type: "string" },
    },
  },
});

/** A flow whose file node points to a local source, which a publication never carries. */
const fileFlow: Flow = {
  ...flowOf([{ ...nodeOf("file", LOCAL_FILE.id), params: { sourceId: "src_1", delimiter: ";" } }]),
  name: "Ventas",
};

function publishedLinkOf(published: Flow): NonNullable<SavedFlow["published"]> {
  return {
    publicationId: "pub_1",
    handle: "ana",
    slug: "ventas",
    version: "0.1.0",
    fingerprint: flowFingerprint(published),
    hasChanges: false,
  };
}

/** Signed in, with the engine's catalog known and `saved` open in the editor. */
async function openPublishedFlow(saved: Flow, published: Flow) {
  const setupResult = cloudSetup(await signedInHub());
  setupResult.stores.engineStore
    .getState()
    .dispatch({ type: "catalog.loaded", nodes: [...CATALOG, LOCAL_FILE] });
  await setupResult.library.saveFlow({
    id: "old",
    name: "Ventas",
    flow: saved,
    files: {},
    updatedAt: 1,
    published: publishedLinkOf(published),
  });
  await setupResult.stores.savedFlowStore.getState().openFlow("old");
  return setupResult;
}

const rename = (stores: ReturnType<typeof cloudSetup>["stores"], name: string) => {
  stores.flowStore.getState().dispatch({ type: "flow.rename", name });
};

it("marks a published flow as changed when an edit is autosaved", async () => {
  const { stores, library, saving } = await openPublishedFlow(flow, flow);
  rename(stores, "Editado");

  await saving.flush();

  expect((await library.readFlow("old")).value?.published).toEqual({
    ...publishedLinkOf(flow),
    hasChanges: true,
  });
  saving.close();
});

it("marks a published flow as unchanged when an edit is undone back to the published content", async () => {
  const { stores, library, saving } = await openPublishedFlow(flow, flow);
  rename(stores, "Editado");
  await saving.flush();
  rename(stores, "Ventas");

  await saving.flush();

  expect((await library.readFlow("old")).value?.published).toEqual(publishedLinkOf(flow));
  saving.close();
});

it("keeps the publication link while autosaving a published flow", async () => {
  const { stores, library, saving } = await openPublishedFlow(flow, flow);
  rename(stores, "Editado");

  await saving.flush();

  expect((await library.readFlow("old")).value).toMatchObject({
    name: "Editado",
    published: { publicationId: "pub_1", handle: "ana", slug: "ventas", version: "0.1.0" },
  });
  saving.close();
});

it("compares the flow without its private params against the published fingerprint", async () => {
  const published = withoutPrivateParams(fileFlow, [...CATALOG, LOCAL_FILE]);
  const { stores, library, saving } = await openPublishedFlow(fileFlow, published);
  rename(stores, "Editado");
  await saving.flush();
  rename(stores, "Ventas");

  await saving.flush();

  expect((await library.readFlow("old")).value?.published?.hasChanges).toBe(false);
  saving.close();
});

it("fingerprints the autosaved flow without its private params", async () => {
  const { stores, library, saving } = await openPublishedFlow(fileFlow, fileFlow);
  rename(stores, "Editado");
  await saving.flush();
  rename(stores, "Ventas");

  await saving.flush();

  expect((await library.readFlow("old")).value?.published?.hasChanges).toBe(true);
  saving.close();
});

it("saves a flow without a publication link without one", async () => {
  const { stores, library, saving } = cloudSetup(await signedInHub());
  await library.saveFlow({ id: "old", name: "Ventas", flow, files: {}, updatedAt: 1 });
  await stores.savedFlowStore.getState().openFlow("old");
  rename(stores, "Editado");

  await saving.flush();

  const saved = (await library.readFlow("old")).value;
  expect({ name: saved?.name, hasPublished: saved !== undefined && "published" in saved }).toEqual({
    name: "Editado",
    hasPublished: false,
  });
  saving.close();
});

it("saves a new flow without a publication link", async () => {
  const { stores, library, saving } = cloudSetup(await signedInHub());
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });

  await saving.flush();

  const saved = (await library.readFlow("flow_test")).value;
  expect(saved !== undefined && "published" in saved).toBe(false);
  saving.close();
});
