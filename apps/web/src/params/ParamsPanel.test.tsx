import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { statusLabel } from "@nodomics/ui";
import { useState } from "react";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { CATALOG, edgeOf, FILTER, flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { ParamsPanel } from "./ParamsPanel.tsx";

function Panel() {
  const [isOpen, setOpen] = useState(true);
  const [width, setWidth] = useState(1);
  return (
    <ParamsPanel
      isOpen={isOpen}
      onToggle={() => {
        setOpen(!isOpen);
      }}
      width={width}
      onResize={setWidth}
    />
  );
}

function renderParams() {
  const stores = createAppStores(flowOf([nodeOf("f", FILTER.id)]));
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });
  stores.selectionStore.getState().select(["f"]);
  return renderWithStores(<Panel />, stores);
}

const detailTabs = () => screen.getByRole("tablist", { name: "Detalle del nodo" });

const detailTab = (name: string) => within(detailTabs()).getByRole("tab", { name });

const tabNames = () =>
  within(detailTabs())
    .getAllByRole("tab")
    .map((tab) => tab.textContent);

const selectedTabName = () =>
  within(detailTabs())
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;

it("heads the selected node's parameters with its name and description", () => {
  renderParams();

  expect(screen.getByRole("heading", { level: 2, name: "Parámetros" })).toBeDefined();
  expect(screen.getByRole("heading", { level: 3, name: "Filtrar" })).toBeDefined();
  expect(screen.getByText("Conserva las filas que cumplen una condición.")).toBeDefined();
});

it("lets the keyboard reach the tab panel", () => {
  renderParams();

  expect(screen.getByRole("tabpanel").getAttribute("tabindex")).toBe("0");
});

it("hides the parameters and keeps a control to show them again", async () => {
  renderParams();

  await userEvent.click(screen.getByRole("button", { name: "Ocultar parámetros" }));

  expect(screen.queryByRole("heading", { name: "Filtrar" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Mostrar parámetros" }));
  expect(screen.getByRole("heading", { name: "Filtrar" })).toBeDefined();
});

it("widens from its left edge while it is open", async () => {
  renderParams();
  const separator = screen.getByRole("separator", { name: "Redimensionar parámetros" });

  expect(separator.getAttribute("aria-valuetext")).toBe("100 %");
  separator.focus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(separator.getAttribute("aria-valuetext")).toBe("110 %");
  await userEvent.click(screen.getByRole("button", { name: "Ocultar parámetros" }));
  expect(screen.queryByRole("separator")).toBeNull();
});

it("lists the node's ports and what feeds each input in the Puertos tab", async () => {
  const stores = createAppStores(
    flowOf(
      [nodeOf("src", SAMPLE.id), nodeOf("f", FILTER.id)],
      [edgeOf("e1", ["src", "out"], ["f", "in"])],
    ),
  );
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });
  stores.selectionStore.getState().select(["f"]);
  renderWithStores(<Panel />, stores);

  await userEvent.click(detailTab("Puertos"));

  const ports = screen.getByRole("list", { name: "Puertos" });
  const [input, output] = within(ports).getAllByRole("listitem");
  expect(input?.textContent).toBe("inEntrada · TablaDatos de ejemplo");
  expect(output?.textContent).toBe("outSalida · Tabla");
});

it("shows on its parameter the error a run reported for it", async () => {
  const stores = createAppStores(flowOf([nodeOf("f", FILTER.id)]));
  const { dispatch } = stores.engineStore.getState();
  dispatch({ type: "catalog.loaded", nodes: CATALOG });
  stores.selectionStore.getState().select(["f"]);
  renderWithStores(<Panel />, stores);

  act(() => {
    dispatch({ type: "run.requested", rev: 0 });
    dispatch({ type: "run.started", rev: 0, runId: "r" });
    dispatch({
      type: "node.status",
      payload: {
        rev: 0,
        runId: "r",
        nodeId: "f",
        state: "error",
        error: { code: "PARAM_INVALID", message: "El valor no sirve", param: "value" },
      },
    });
  });

  expect((await screen.findByRole("alert")).textContent).toContain("El valor no sirve");
});

it("offers a newer saved version and updates every instance with undo", async () => {
  const manifest = { ...FILTER, id: "mine.saved", name: "Mi filtro" };
  const newer = { ...manifest, version: "0.1.1" };
  const stores = createAppStores({
    ...flowOf([nodeOf("one", manifest.id)]),
    customNodes: [manifest],
  });
  stores.selectionStore.getState().select(["one"]);
  await stores.savedFlowStore.getState().library.saveFlow({
    id: "saved",
    name: "Nodo",
    flow: flowOf([]),
    files: {},
    updatedAt: 1,
    node: { version: newer.version, fingerprint: "test", manifest: newer },
  });
  await stores.savedFlowStore.getState().refresh();
  renderWithStores(<Panel />, stores);
  await userEvent.click(screen.getByRole("button", { name: "Actualizar a la versión 0.1.1" }));
  expect(stores.flowStore.getState().state.flow.nodes[0]?.version).toBe("0.1.1");
  act(() => {
    stores.flowStore.getState().dispatch({ type: "history.undo" });
  });
  expect(stores.flowStore.getState().state.flow.customNodes).toEqual([manifest]);
});

it("ignores selected ids of nodes that are not in the open flow, as after opening another flow", () => {
  const stores = createAppStores(flowOf([nodeOf("f", FILTER.id)]));
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });
  stores.selectionStore.getState().select(["from-another-flow", "f"]);
  renderWithStores(<Panel />, stores);

  expect(screen.getByRole("heading", { level: 3, name: "Filtrar" })).toBeDefined();
});

it("details the selected node in the tabs Parámetros, Puertos and Historia", () => {
  renderParams();

  expect(tabNames()).toEqual(["Parámetros", "Puertos", "Historia"]);
});

it("starts on the Parámetros tab with the parameters form", () => {
  renderParams();

  expect({
    selected: selectedTabName(),
    ports: screen.queryByRole("list", { name: "Puertos" }),
  }).toEqual({ selected: "Parámetros", ports: null });
});

it("shows each tab's panel labelled by its tab", async () => {
  renderParams();

  await userEvent.click(detailTab("Puertos"));

  const panel = screen.getByRole("tabpanel");
  expect({
    controls: detailTab("Puertos").getAttribute("aria-controls"),
    name: panel.getAttribute("aria-labelledby"),
  }).toEqual({ controls: panel.id, name: detailTab("Puertos").id });
});

it("shows the ports when the Puertos tab is chosen", async () => {
  renderParams();

  await userEvent.click(detailTab("Puertos"));

  expect({
    selected: selectedTabName(),
    ports: screen.queryByRole("list", { name: "Puertos" }) !== null,
  }).toEqual({ selected: "Puertos", ports: true });
});

it("shows the history mockup note in the Historia tab", async () => {
  renderParams();

  await userEvent.click(detailTab("Historia"));

  expect(
    within(screen.getByRole("tabpanel")).getByText(
      /Maqueta: aquí verás quién cambió este nodo, cuándo y por qué\./,
    ),
  ).toBeDefined();
});

it("moves to the next tab with the right arrow", async () => {
  renderParams();
  detailTab("Parámetros").focus();

  await userEvent.keyboard("{ArrowRight}");

  expect({ selected: selectedTabName(), focused: document.activeElement }).toEqual({
    selected: "Puertos",
    focused: detailTab("Puertos"),
  });
});

it("moves to the previous tab with the left arrow", async () => {
  renderParams();
  await userEvent.click(detailTab("Historia"));

  await userEvent.keyboard("{ArrowLeft}");

  expect({ selected: selectedTabName(), focused: document.activeElement }).toEqual({
    selected: "Puertos",
    focused: detailTab("Puertos"),
  });
});

it("keeps only the selected tab in the tab order", async () => {
  renderParams();

  await userEvent.click(detailTab("Puertos"));

  expect(
    within(detailTabs())
      .getAllByRole("tab")
      .map((tab) => tab.getAttribute("tabindex")),
  ).toEqual(["-1", "0", "-1"]);
});

it("has no node detail tabs without a selected node", () => {
  const stores = createAppStores(flowOf([nodeOf("f", FILTER.id)]));
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });

  renderWithStores(<Panel />, stores);

  expect(screen.queryByRole("tablist", { name: "Detalle del nodo" })).toBeNull();
});

it("shows the selected node's run status with the node card's label", () => {
  const stores = createAppStores(flowOf([nodeOf("s", SAMPLE.id)]));
  const { dispatch } = stores.engineStore.getState();
  dispatch({ type: "catalog.loaded", nodes: CATALOG });
  stores.selectionStore.getState().select(["s"]);
  renderWithStores(<Panel />, stores);

  act(() => {
    dispatch({ type: "run.requested", rev: 0 });
    dispatch({ type: "run.started", rev: 0, runId: "r" });
    dispatch({ type: "node.status", payload: { rev: 0, runId: "r", nodeId: "s", state: "done" } });
  });

  expect(screen.getByText(statusLabel("done"))).toBeDefined();
});

it("offers to run only the selected node", () => {
  renderParams();

  expect(screen.getByRole("button", { name: "Ejecutar este nodo" })).toBeDefined();
});

it("does not offer to run a node without a selected node", () => {
  const stores = createAppStores(flowOf([nodeOf("f", FILTER.id)]));
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: CATALOG });

  renderWithStores(<Panel />, stores);

  expect(screen.queryByRole("button", { name: "Ejecutar este nodo" })).toBeNull();
});
