import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PreviewLocationContext } from "../layout/preview-location.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { createAppStores } from "../app-stores.ts";
import { CATALOG, FILTER, flowOf, manifestOf, nodeOf } from "./canvas-fixtures.ts";
import { NodeActionToolbar } from "./NodeActionToolbar.tsx";

function setup(opened: string[] = []) {
  const rendered = renderWithStores(
    <PreviewLocationContext
      value={{ location: "nodes", openInPanel: (nodeId) => opened.push(nodeId) }}
    >
      <NodeActionToolbar nodeId="a" />
    </PreviewLocationContext>,
  );
  rendered.stores.flowStore
    .getState()
    .dispatch({ type: "node.add", node: nodeOf("a", "core.filter") });
  return rendered;
}

describe("node actions", () => {
  it("opens the node's whole result in the preview panel", async () => {
    const opened: string[] = [];
    setup(opened);

    await userEvent.click(screen.getByRole("button", { name: "Ver resultado" }));

    expect(opened).toEqual(["a"]);
  });

  it("explains unavailable actions", () => {
    setup();

    expect(
      screen.getByRole("button", { name: "Desactivar nodo" }).getAttribute("aria-describedby"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ejecutar este nodo" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("navigates the menu, closes on Escape and returns focus", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: "Más acciones" });

    await userEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Duplicar nodo" }));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Eliminar nodo" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps keyboard focus when the selection updates", async () => {
    const { stores } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.keyboard("{ArrowDown}");

    act(() => {
      stores.selectionStore.getState().select(["a"]);
    });

    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Eliminar nodo" }));
  });

  it("does not offer conversion in the node menu", async () => {
    const { stores } = setup();
    stores.selectionStore.getState().select(["a", "b"]);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.queryByRole("menuitem", { name: "Convertir en nodo" })).toBeNull();
  });

  it("duplicates and removes through undoable commands", async () => {
    const { stores } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicar nodo" }));
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Eliminar nodo" }));

    expect(stores.flowStore.getState().state.flow.nodes.map((node) => node.id)).not.toContain("a");
    stores.flowStore.getState().dispatch({ type: "history.undo" });
    expect(stores.flowStore.getState().state.flow.nodes.map((node) => node.id)).toContain("a");
  });
});

it("runs the selected node through the engine connection", async () => {
  const { engine } = renderWithEngine(<NodeActionToolbar nodeId="a" />, {
    handlers: { "flow.run": () => ({ runId: "targeted" }) },
  });

  await userEvent.click(screen.getByRole("button", { name: "Ejecutar este nodo" }));

  await waitFor(() => {
    expect(engine.calls).toContainEqual({
      method: "flow.run",
      params: { rev: 0, targets: ["a"] },
    });
  });
});

describe("node actions of a resource node", () => {
  const REPO = manifestOf("core.deploy.repo", {
    name: "Repo",
    category: "Hosteo",
    inputs: [],
    outputs: [{ id: "repo", type: "repo" }],
    impl: { kind: "resource", resource: "repo" },
  });
  const SERVICE = manifestOf("core.deploy.service", {
    name: "Servicio",
    category: "Hosteo",
    inputs: [{ id: "repo", type: "repo" }],
    outputs: [{ id: "service", type: "service" }],
    impl: { kind: "resource", resource: "service" },
  });

  function setupNodeOfType(type: string) {
    const stores = createAppStores(flowOf([nodeOf("a", type)]));
    stores.engineStore
      .getState()
      .dispatch({ type: "catalog.loaded", nodes: [...CATALOG, REPO, SERVICE] });
    return renderWithEngine(
      <PreviewLocationContext value={{ location: "nodes", openInPanel: () => undefined }}>
        <NodeActionToolbar nodeId="a" />
      </PreviewLocationContext>,
      { stores },
    );
  }

  it.each([REPO.id, SERVICE.id])("does not offer to run a %s node", (type) => {
    setupNodeOfType(type);

    expect(screen.queryByRole("button", { name: "Ejecutar este nodo" })).toBeNull();
  });

  it("keeps the other actions of a resource node", () => {
    setupNodeOfType(REPO.id);

    expect(screen.getByRole("button", { name: "Desactivar nodo" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Más acciones" })).toBeDefined();
  });

  it("still offers to run a data node", () => {
    setupNodeOfType(FILTER.id);

    expect(screen.getByRole("button", { name: "Ejecutar este nodo" })).toBeDefined();
  });
});
