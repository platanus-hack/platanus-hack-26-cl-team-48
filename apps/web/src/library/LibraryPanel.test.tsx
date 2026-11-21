import type { NodeManifest } from "@nodomics/protocol";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../canvas/canvas-fixtures.ts";
import { NODE_DRAG_TYPE } from "../canvas/drag-types.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { LibraryPanel } from "./LibraryPanel.tsx";

function renderLibrary() {
  const added: NodeManifest[] = [];
  const rendered = renderWithStores(<LibraryPanel onAdd={(manifest) => added.push(manifest)} />);
  rendered.stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });
  return { added, ...rendered };
}

describe("LibraryPanel", () => {
  it("lists the engine's nodes grouped by category", async () => {
    renderLibrary();

    expect(await screen.findByRole("heading", { name: "Fuentes" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Vistas" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeDefined();
  });

  it("describes each node in its tooltip", async () => {
    renderLibrary();

    expect((await screen.findByRole("button", { name: "Filtrar" })).getAttribute("title")).toBe(
      "Filtrar: conserva las filas que cumplen una condición",
    );
  });

  it("adds a node on double click", async () => {
    const { added } = renderLibrary();

    await userEvent.dblClick(await screen.findByRole("button", { name: "Filtrar" }));

    expect(added.map((manifest) => manifest.id)).toEqual(["core.filter"]);
  });

  it("adds a node with the keyboard", async () => {
    const { added } = renderLibrary();
    (await screen.findByRole("button", { name: "Unir tablas" })).focus();

    await userEvent.keyboard("{Enter}");

    expect(added.map((manifest) => manifest.id)).toEqual(["core.join"]);
  });

  it("carries the node type when dragged to the canvas", async () => {
    renderLibrary();
    const data = new Map<string, string>();

    fireEvent.dragStart(await screen.findByRole("button", { name: "Filtrar" }), {
      dataTransfer: { setData: (type: string, value: string) => data.set(type, value) },
    });

    expect(data.get(NODE_DRAG_TYPE)).toBe("core.filter");
  });

  it("explains how to add a node", () => {
    renderLibrary();

    expect(
      screen.getByText("Arrastra un nodo al lienzo, o haz doble clic para agregarlo"),
    ).toBeDefined();
  });

  it("offers a search field for the nodes", () => {
    renderLibrary();

    expect(screen.getByRole("searchbox", { name: "Buscar nodos" })).toBeDefined();
  });

  it("has no aside or collapse control of its own", () => {
    renderLibrary();

    expect({
      aside: screen.queryByRole("complementary"),
      hide: screen.queryByRole("button", { name: "Ocultar biblioteca" }),
    }).toEqual({ aside: null, hide: null });
  });
});

it("filters the catalog by node name and description", async () => {
  renderLibrary();

  await userEvent.type(await screen.findByRole("searchbox", { name: "Buscar nodos" }), "filtrar");

  expect(screen.getByRole("button", { name: "Filtrar" })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Unir tablas" })).toBeNull();
});
