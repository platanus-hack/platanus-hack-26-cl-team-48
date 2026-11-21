import type { NodeManifest } from "@nodomics/protocol";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../canvas/canvas-fixtures.ts";
import { NODE_DRAG_TYPE } from "../canvas/drag-types.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { LibraryPanel } from "./LibraryPanel.tsx";

function Library({ onAdd }: { readonly onAdd: (manifest: NodeManifest) => void }) {
  const [isOpen, setOpen] = useState(true);
  return (
    <LibraryPanel
      isOpen={isOpen}
      onToggle={() => {
        setOpen(!isOpen);
      }}
      onAdd={onAdd}
    />
  );
}

function renderLibrary() {
  const added: NodeManifest[] = [];
  const rendered = renderWithStores(<Library onAdd={(manifest) => added.push(manifest)} />);
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

  it("collapses to a rail of icons that still adds nodes", async () => {
    const { added } = renderLibrary();

    await userEvent.click(screen.getByRole("button", { name: "Ocultar biblioteca" }));

    expect(screen.queryByRole("textbox", { name: "Buscar nodos" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Fuentes" })).toBeNull();
    await userEvent.dblClick(screen.getByRole("button", { name: "Filtrar" }));
    expect(added.map((manifest) => manifest.id)).toEqual(["core.filter"]);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar biblioteca" }));
    expect(screen.getByRole("textbox", { name: "Buscar nodos" })).toBeDefined();
  });
});

it("filters the catalog by node name and description", async () => {
  renderLibrary();
  await userEvent.type(await screen.findByRole("textbox", { name: "Buscar nodos" }), "filtrar");
  expect(screen.getByRole("button", { name: "Filtrar" })).toBeDefined();
  expect(screen.queryByRole("button", { name: "Unir tablas" })).toBeNull();
});
