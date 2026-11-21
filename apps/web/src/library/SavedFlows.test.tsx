import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, expect, it } from "vitest";
import { FLOW_FORMAT } from "@nodomics/protocol";
import { createAppStores } from "../app-stores.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { SavedFlows } from "./SavedFlows.tsx";
import { MESSAGES } from "../messages.ts";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
async function setup() {
  const stores = createAppStores();
  await stores.savedFlowStore.getState().library.saveFlow({
    id: "one",
    name: "Ventas",
    flow: { format: FLOW_FORMAT, name: "Ventas", nodes: [], edges: [] },
    files: {},
    updatedAt: 1,
  });
  await stores.savedFlowStore
    .getState()
    .library.saveFile({ key: "csv", name: "ventas.csv", size: 10, savedAt: 1 });
  renderWithStores(<SavedFlows />, stores);
  await userEvent.click(screen.getByRole("button", { name: MESSAGES.savedFlows.title }));
  return { stores, dialog: await screen.findByRole("dialog") };
}
it("opens the library, navigates accessible tabs and returns focus on Escape", async () => {
  const { dialog } = await setup();
  expect(within(dialog).getByText("Ventas")).toBeTruthy();
  const flows = screen.getByRole("tab", { name: "Flujos" });
  flows.focus();
  await userEvent.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByRole("tab", { name: "Datos" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("ventas.csv")).toBeTruthy();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mis flujos" }));
});
it("opens saved flows, creates an empty flow, duplicates, renames and confirms deletion inline", async () => {
  const { stores } = await setup();
  await userEvent.click(screen.getByRole("button", { name: "Duplicar" }));
  await screen.findByText("Ventas (copia)");
  const original = screen.getByRole("article", { name: "Ventas" });
  await userEvent.click(within(original).getByRole("button", { name: "Renombrar" }));
  const input = within(original).getByRole("textbox");
  fireEvent.change(input, { target: { value: "Compras" } });
  await userEvent.click(within(original).getByRole("button", { name: "Guardar nombre" }));
  await screen.findByText("Compras");
  await userEvent.click(
    within(screen.getByRole("article", { name: "Compras" })).getByRole("button", { name: "Abrir" }),
  );
  expect(stores.savedFlowStore.getState().currentId).toBe("one");
  await userEvent.click(screen.getByRole("button", { name: "Mis flujos" }));
  await userEvent.click(screen.getByRole("button", { name: "Nuevo flujo" }));
  expect(stores.savedFlowStore.getState().currentId).toBeUndefined();
  expect(stores.flowStore.getState().state.flow.nodes).toEqual([]);
  await userEvent.click(screen.getByRole("button", { name: "Mis flujos" }));
  const card = screen.getByRole("article", { name: "Compras" });
  await userEvent.click(within(card).getByRole("button", { name: "Borrar" }));
  expect((await stores.savedFlowStore.getState().library.listFlows()).value).toHaveLength(2);
  await userEvent.click(within(card).getByRole("button", { name: "Confirmar borrado" }));
  await act(async () => {
    await stores.savedFlowStore.getState().refresh();
  });
  expect(screen.queryByText("Compras")).toBeNull();
});
it("renames the open flow through a command and displays saving status", () => {
  const { stores } = renderWithStores(<SavedFlows />);
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre del flujo" }), {
    target: { value: "Análisis" },
  });
  expect(stores.flowStore.getState().state.flow.name).toBe("Análisis");
  expect(stores.flowStore.getState().state.undo).toHaveLength(1);
  act(() => {
    stores.savedFlowStore.setState({ status: "saving" });
  });
  expect(screen.getByRole("status").textContent).toBe("Guardando…");
});

it("lists invalid node flows and legacy nodes in the nodes tab", async () => {
  const { stores } = await setup();
  await stores.savedFlowStore.getState().library.saveFlow({
    id: "invalid",
    name: "Incompleto",
    flow: {
      format: FLOW_FORMAT,
      nodes: [
        {
          id: "entry",
          type: "flow.node",
          version: "0.1.0",
          position: { x: 0, y: 0 },
          params: {},
        },
      ],
      edges: [],
    },
    files: {},
    updatedAt: 2,
  });
  stores.engineStore.getState().dispatch({
    type: "catalog.loaded",
    nodes: [
      {
        id: "flow.node",
        name: "Entrada de nodo",
        category: "Flujo",
        version: "0.1.0",
        inputs: [],
        outputs: [],
        params: { type: "object", properties: {} },
        impl: { kind: "builtin", name: "flow.node" },
      },
    ],
  });
  await act(async () => {
    await stores.savedFlowStore.getState().refresh();
  });
  await userEvent.click(screen.getByRole("tab", { name: "Nodos" }));
  expect(screen.getByText("Incompleto")).toBeTruthy();
  expect(screen.getByText("Agrega una «Salida de nodo»")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Abrir flujo" }));
  expect(stores.savedFlowStore.getState().currentId).toBe("invalid");
});

it("adds and replaces password credentials without displaying their values and confirms deletion inline", async () => {
  const { stores } = await setup();
  await userEvent.click(screen.getByRole("tab", { name: "Credenciales" }));
  expect(
    screen.getByText("Se guardan sin cifrar en este navegador y nunca se incluyen en el flujo"),
  ).toBeTruthy();
  const name = screen.getByRole("textbox", { name: "Nombre" });
  const password = screen.getByLabelText("Valor");
  expect(password.getAttribute("type")).toBe("password");
  await userEvent.type(name, "api-token");
  await userEvent.type(password, "hidden-token");
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

  const card = await screen.findByRole("article", { name: "api-token" });
  expect(card.textContent).not.toContain("hidden-token");
  expect(screen.queryByDisplayValue("hidden-token")).toBeNull();
  await userEvent.type(name, "api-token");
  await userEvent.type(password, "replacement");
  await userEvent.click(screen.getByRole("button", { name: "Reemplazar" }));
  expect((await stores.savedFlowStore.getState().library.readSecrets()).value).toEqual([
    { name: "api-token", value: "replacement" },
  ]);

  await userEvent.click(within(card).getByRole("button", { name: "Borrar" }));
  expect((await stores.savedFlowStore.getState().library.listSecretNames()).value).toEqual([
    "api-token",
  ]);
  await userEvent.click(within(card).getByRole("button", { name: "Cancelar" }));
  await userEvent.click(within(card).getByRole("button", { name: "Borrar" }));
  await userEvent.click(within(card).getByRole("button", { name: "Confirmar borrado" }));
  expect(await screen.findByText("Todavía no hay credenciales guardadas.")).toBeTruthy();
});
