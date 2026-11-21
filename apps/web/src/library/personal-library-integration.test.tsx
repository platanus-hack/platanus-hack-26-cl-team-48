import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useCatalog } from "../app-context.ts";
import { createAppStores } from "../app-stores.ts";
import { manifestOf } from "../canvas/canvas-fixtures.ts";
import { useAddNode } from "../canvas/use-add-node.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { LibraryPanel } from "./LibraryPanel.tsx";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createStoragePersonalLibrary } from "./storage-personal-library.ts";

const NODE = manifestOf("personal.filter", { name: "Mi filtro", category: "Mis nodos" });
const EMPTY: Flow = { format: FLOW_FORMAT, nodes: [], edges: [] };

function Library() {
  return <LibraryPanel isOpen onToggle={() => undefined} onAdd={useAddNode()} />;
}

function renderPersonalLibrary() {
  const library = createMemoryPersonalLibrary();
  library.add(NODE);
  const stores = createAppStores(undefined, library);
  renderWithStores(<Library />, stores);
  return stores;
}

describe("personal library integration", () => {
  it("keeps personal nodes available after loading another flow", async () => {
    const stores = renderPersonalLibrary();

    act(() => {
      stores.flowStore.getState().dispatch({ type: "flow.load", flow: EMPTY });
    });

    expect(await screen.findByRole("button", { name: "Mi filtro" })).toBeDefined();
  });

  it("unions personal and flow manifests by id, preferring the flow", async () => {
    const stores = renderPersonalLibrary();

    act(() => {
      stores.flowStore.getState().dispatch({
        type: "flow.load",
        flow: {
          ...EMPTY,
          customNodes: [
            { ...NODE, name: "Del flujo" },
            manifestOf("personal.other", { category: "Mis nodos" }),
          ],
        },
      });
    });

    expect(await screen.findByRole("button", { name: "Del flujo" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Mi filtro" })).toBeNull();
    expect(screen.getByRole("button", { name: "personal.other" })).toBeDefined();
  });

  it("copies a personal manifest with its instance in one undoable command", async () => {
    const stores = renderPersonalLibrary();

    await userEvent.dblClick(await screen.findByRole("button", { name: "Mi filtro" }));

    expect(stores.flowStore.getState().state.flow.customNodes).toEqual([NODE]);
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
    act(() => {
      stores.flowStore.getState().dispatch({ type: "history.undo" });
    });
    expect(stores.flowStore.getState().state.flow.nodes).toEqual([]);
    expect(stores.flowStore.getState().state.flow.customNodes ?? []).toEqual([]);
    act(() => {
      stores.flowStore.getState().dispatch({ type: "history.redo" });
    });
    expect(stores.flowStore.getState().state.flow.customNodes).toEqual([NODE]);
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
  });

  it("does not duplicate or remove an existing flow manifest when undoing an instance", async () => {
    const stores = renderPersonalLibrary();
    act(() => {
      stores.flowStore
        .getState()
        .dispatch({ type: "flow.load", flow: { ...EMPTY, customNodes: [NODE] } });
    });

    await userEvent.dblClick(await screen.findByRole("button", { name: "Mi filtro" }));
    await userEvent.dblClick(screen.getByRole("button", { name: "Mi filtro" }));
    act(() => {
      stores.flowStore.getState().dispatch({ type: "history.undo" });
    });

    expect(stores.flowStore.getState().state.flow.customNodes).toEqual([NODE]);
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
  });

  it.each(["invalid", "unavailable"])("shows a notice for %s storage", (issue) => {
    const library = createStoragePersonalLibrary(() => {
      if (issue === "unavailable") throw new Error("blocked");
      return { getItem: () => "{", setItem: () => {} };
    });

    const stores = createAppStores(undefined, library);

    expect(stores.noticeStore.getState().notice?.tone).toBe("warn");
    expect(stores.noticeStore.getState().notice?.title).toBeTruthy();
  });
});

it("lists saved nodes except the open flow and copies their dependencies", async () => {
  const child = manifestOf("mine.child", { name: "Hijo", category: "Mis nodos" });
  const parent = manifestOf("mine.parent", {
    name: "Padre",
    category: "Mis nodos",
    impl: {
      kind: "flow",
      graph: {
        nodes: [
          {
            id: "child",
            type: child.id,
            version: child.version,
            params: {},
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
    },
  });
  const stores = createAppStores();
  for (const manifest of [parent, child])
    await stores.savedFlowStore.getState().library.saveFlow({
      id: manifest.id.slice(5),
      name: manifest.name,
      flow: EMPTY,
      files: {},
      updatedAt: 1,
      node: { manifest, version: manifest.version, fingerprint: "test" },
    });
  await stores.savedFlowStore.getState().refresh();
  renderWithStores(<Library />, stores);
  await userEvent.dblClick(await screen.findByRole("button", { name: "Padre" }));
  expect(stores.flowStore.getState().state.flow.customNodes).toEqual([parent, child]);
  act(() => {
    stores.savedFlowStore.setState({ currentId: "parent" });
  });
  expect(screen.queryByRole("button", { name: "Padre" })).toBeNull();
});

it("keeps the dependencies saved inside a node flow when their library flow is gone", async () => {
  const child = manifestOf("mine.deleted", { name: "Dependencia", category: "Mis nodos" });
  const parent = manifestOf("mine.parent", {
    name: "Padre",
    category: "Mis nodos",
    impl: {
      kind: "flow",
      graph: {
        nodes: [
          {
            id: "child",
            type: child.id,
            version: child.version,
            params: {},
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
    },
  });
  const stores = createAppStores();
  await stores.savedFlowStore.getState().library.saveFlow({
    id: "parent",
    name: "Padre",
    flow: { ...EMPTY, customNodes: [child] },
    files: {},
    updatedAt: 1,
    node: { manifest: parent, version: parent.version, fingerprint: "test" },
  });
  await stores.savedFlowStore.getState().refresh();
  renderWithStores(<Library />, stores);
  await userEvent.dblClick(screen.getByRole("button", { name: "Padre" }));
  expect(stores.flowStore.getState().state.flow.customNodes).toEqual([parent, child]);
});

it("copies a node saved after the library first renders", async () => {
  const stores = createAppStores();
  renderWithStores(<Library />, stores);
  await act(async () => {
    await stores.savedFlowStore.getState().library.saveFlow({
      id: "late",
      name: "Tardío",
      flow: EMPTY,
      files: {},
      updatedAt: 1,
      node: { version: NODE.version, fingerprint: "test", manifest: NODE },
    });
    await stores.savedFlowStore.getState().refresh();
  });
  await userEvent.dblClick(screen.getByRole("button", { name: "Mi filtro" }));
  expect(stores.flowStore.getState().state.flow.customNodes).toEqual([NODE]);
});

function CatalogNames() {
  return (
    <p>
      {useCatalog()
        .map((manifest) => manifest.name)
        .join(", ")}
    </p>
  );
}
it("excludes the open flow from the application catalog", async () => {
  const stores = createAppStores();
  const manifest = { ...NODE, id: "mine.current" };
  await stores.savedFlowStore.getState().library.saveFlow({
    id: "current",
    name: "Actual",
    flow: EMPTY,
    files: {},
    updatedAt: 1,
    node: { version: manifest.version, fingerprint: "test", manifest },
  });
  await stores.savedFlowStore.getState().refresh();
  stores.savedFlowStore.setState({ currentId: "current" });
  renderWithStores(<CatalogNames />, stores);
  expect(screen.queryByText("Mi filtro")).toBeNull();
});
