import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import type { NodeManifest } from "@nodomics/protocol";
import { createAppStores } from "../app-stores.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { manifestOf, nodeOf, flowOf } from "./canvas-fixtures.ts";
import { useAddNode } from "./use-add-node.ts";

const source = manifestOf("csv", {
  params: {
    type: "object",
    properties: { sourceId: { type: "string", "x-nodomics": { widget: "source" } } },
  },
});
const personal = manifestOf("mine.saved", {
  impl: {
    kind: "flow",
    graph: { nodes: [{ ...nodeOf("csv", "csv"), params: { sourceId: "source_1" } }], edges: [] },
  },
});
function Add({ manifest }: { readonly manifest: NodeManifest }) {
  const add = useAddNode();
  return (
    <button
      onClick={() => {
        add(manifest);
      }}
    >
      Add
    </button>
  );
}
it("uses the version already copied when adding another instance", async () => {
  const stores = createAppStores({ ...flowOf([]), customNodes: [personal] });
  renderWithStores(<Add manifest={{ ...personal, version: "0.1.1" }} />, stores);
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  expect(stores.flowStore.getState().state.flow.nodes[0]?.version).toBe(personal.version);
});
it("copies file associations without trusting colliding engine ids", async () => {
  const stores = createAppStores();
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [source] });
  stores.savedFlowStore.setState({
    flows: [
      {
        id: "saved",
        name: "Saved",
        flow: flowOf([]),
        files: { source_1: "wanted" },
        updatedAt: 1,
        node: { version: personal.version, manifest: personal, fingerprint: "test" },
      },
    ],
  });
  stores.savedFlowStore.getState().trackSource("source_1", "other");
  renderWithStores(<Add manifest={personal} />, stores);
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  const manifest = stores.flowStore.getState().state.flow.customNodes?.[0];
  const id =
    manifest?.impl.kind === "flow" ? manifest.impl.graph.nodes[0]?.params["sourceId"] : undefined;
  expect(typeof id === "string" && stores.savedFlowStore.getState().files[id]).toBe("wanted");
  expect(typeof id === "string" && stores.savedFlowStore.getState().sessionSources.has(id)).toBe(
    false,
  );
  act(() => {
    stores.flowStore.getState().dispatch({ type: "history.undo" });
  });
  act(() => {
    stores.flowStore.getState().dispatch({ type: "history.redo" });
  });
  expect(stores.flowStore.getState().state.flow.customNodes?.[0]).toEqual(manifest);
});

it("uses the parent flow file associations for its copied dependencies", async () => {
  const stores = createAppStores();
  const parent = manifestOf("mine.parent", {
    impl: { kind: "flow", graph: { nodes: [nodeOf("child", personal.id)], edges: [] } },
  });
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [source] });
  stores.savedFlowStore.setState({
    flows: [
      {
        id: "saved",
        name: "Child",
        flow: flowOf([]),
        files: { different: "latest" },
        updatedAt: 2,
        node: { version: personal.version, manifest: personal, fingerprint: "child" },
      },
      {
        id: "parent",
        name: "Parent",
        flow: { ...flowOf([]), customNodes: [personal] },
        files: { source_1: "parent-file" },
        updatedAt: 1,
        node: { version: parent.version, manifest: parent, fingerprint: "parent" },
      },
    ],
  });
  renderWithStores(<Add manifest={parent} />, stores);
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  const child = stores.flowStore
    .getState()
    .state.flow.customNodes?.find(({ id }) => id === personal.id);
  const id =
    child?.impl.kind === "flow" ? child.impl.graph.nodes[0]?.params["sourceId"] : undefined;
  expect(typeof id === "string" && stores.savedFlowStore.getState().files[id]).toBe("parent-file");
});
