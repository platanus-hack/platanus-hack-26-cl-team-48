import type { NodeManifest } from "@nodomics/protocol";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { manifestOf, nodeOf, flowOf, FILTER } from "../canvas/canvas-fixtures.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { ParamsForm } from "./ParamsForm.tsx";

const entry = manifestOf("flow.node", { impl: { kind: "builtin", name: "flow.node" } });
it("exposes a field, marks it and removes the exposure with undo", async () => {
  const node = nodeOf("filter", FILTER.id);
  const stores = createAppStores(flowOf([nodeOf("entry", entry.id), node]));
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [entry, FILTER] });
  renderWithStores(
    <ParamsForm node={node} manifest={FILTER} issues={[]} onChange={() => undefined} />,
    stores,
  );
  await userEvent.click(
    screen.getAllByRole("button", { name: "Exponer como parámetro del nodo" })[0] ?? document.body,
  );
  expect(stores.flowStore.getState().state.flow.nodes[0]?.params["params"]).toEqual([
    { id: "op", title: "op", node: "filter", param: "op" },
  ]);
  expect(screen.getByText("Expuesto")).toBeDefined();
  await userEvent.click(
    screen.getByRole("button", { name: "Dejar de exponer como parámetro del nodo" }),
  );
  expect(stores.flowStore.getState().state.flow.nodes[0]?.params["params"]).toEqual([]);
  act(() => {
    stores.flowStore.getState().dispatch({ type: "history.undo" });
  });
  expect(screen.getByText("Expuesto")).toBeDefined();
});
it("offers no exposure without exactly one entry", () => {
  const node = nodeOf("filter", FILTER.id);
  renderWithStores(
    <ParamsForm node={node} manifest={FILTER} issues={[]} onChange={() => undefined} />,
  );
  expect(screen.queryByRole("button", { name: "Exponer como parámetro del nodo" })).toBeNull();
});

it("edits exposure titles, shows their source read only and never offers Add", async () => {
  const manifest: NodeManifest = {
    ...entry,
    params: {
      type: "object",
      properties: {
        params: {
          title: "Parámetros del nodo",
          type: "array",
          "x-nodomics": { widget: "node-params" },
        },
      },
    },
  };
  const node = {
    ...nodeOf("entry", entry.id),
    params: { params: [{ id: "value", title: "Mínimo", node: "filter", param: "value" }] },
  };
  const changes: unknown[] = [];
  const stores = createAppStores(
    flowOf([node, { ...nodeOf("filter", FILTER.id), label: "Ventas grandes" }]),
  );
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [manifest, FILTER] });
  renderWithStores(
    <ParamsForm
      node={node}
      manifest={manifest}
      issues={[]}
      onChange={(_param, value) => changes.push(value)}
    />,
    stores,
  );
  expect(screen.queryByRole("button", { name: "Agregar" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Nodo › parámetro" })).toHaveProperty(
    "readOnly",
    true,
  );
  expect(screen.getByRole("textbox", { name: "Nodo › parámetro" })).toHaveProperty(
    "value",
    "Ventas grandes › value",
  );
  await userEvent.type(screen.getByRole("textbox", { name: "Título" }), "s");
  expect(changes.at(-1)).toEqual([
    { id: "value", title: "Mínimos", node: "filter", param: "value" },
  ]);
  await userEvent.click(screen.getByRole("button", { name: "Quitar" }));
  expect(changes.at(-1)).toEqual([]);
});
