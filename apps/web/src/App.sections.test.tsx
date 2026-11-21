import { FLOW_FORMAT, type NodeManifest } from "@nodomics/protocol";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAppStores, type AppStores } from "./app-stores.ts";
import { CATALOG, flowOf, nodeOf, SAMPLE } from "./canvas/canvas-fixtures.ts";
import { ANA, createTestHub } from "./hub/hub-pages-fixtures.tsx";
import type { WorkspacePreferences } from "./layout/workspace-preferences.ts";
import { recordDownloads } from "./testing/record-downloads.ts";
import { renderApp } from "./testing/render-app.tsx";
import { stubResizeObserver } from "./testing/stub-resize-observer.ts";

const FLOW_NODE: NodeManifest = {
  id: "flow.node",
  name: "Entrada de nodo",
  category: "Flujo",
  version: "0.1.0",
  inputs: [],
  outputs: [],
  params: { type: "object", properties: {} },
  impl: { kind: "builtin", name: "flow.node" },
};

async function seededStores(): Promise<AppStores> {
  const stores = createAppStores();
  const { library, refresh } = stores.savedFlowStore.getState();
  await library.saveFlow({
    id: "one",
    name: "Ventas",
    flow: { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Ventas" },
    files: {},
    updatedAt: 1,
  });
  await library.saveFile({ key: "csv", name: "ventas.csv", size: 10, savedAt: 1 });
  await refresh();
  return stores;
}

const PANEL_NAMES: Record<WorkspacePreferences["sideSection"], string> = {
  nodes: "Biblioteca de nodos",
  flows: "Mis flujos",
  "my-nodes": "Mis nodos",
  data: "Datos",
  secrets: "Credenciales",
  agent: "Agente",
};

async function signedInHub() {
  const hub = createTestHub();
  await hub.signIn({ kind: "email", email: ANA.handle });
  return hub;
}

/** Signed in, because Mis flujos and Agente are only offered with an account. */
async function renderSection(sideSection: WorkspacePreferences["sideSection"], stores?: AppStores) {
  const rendered = renderApp({
    stores: stores ?? (await seededStores()),
    hub: await signedInHub(),
    preferences: { sideSection, isSidePanelOpen: true },
    handlers: { "nodes.list": () => ({ nodes: [...CATALOG] }) },
  });
  await screen.findByRole("complementary", { name: PANEL_NAMES[sideSection] });
  return rendered;
}

const panel = (name: string) => screen.getByRole("complementary", { name });

const flowCard = (name: string) => within(panel("Mis flujos")).getByRole("article", { name });

beforeAll(stubResizeObserver);

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("Nodos section", () => {
  it("explains how to add a node", async () => {
    await renderSection("nodes");

    expect(
      within(panel("Biblioteca de nodos")).getByText(
        "Arrastra un nodo al lienzo, o haz doble clic para agregarlo",
      ),
    ).toBeTruthy();
  });

  it("offers a search field for the nodes", async () => {
    await renderSection("nodes");

    expect(
      within(panel("Biblioteca de nodos")).getByRole("searchbox", { name: "Buscar nodos" }),
    ).toBeTruthy();
  });

  it("groups the engine's nodes by category", async () => {
    await renderSection("nodes");

    expect(
      await within(panel("Biblioteca de nodos")).findByRole("heading", { name: "Fuentes" }),
    ).toBeTruthy();
  });

  it("adds a node to the flow on double click", async () => {
    const { stores } = await renderSection("nodes");

    await userEvent.dblClick(
      await within(panel("Biblioteca de nodos")).findByRole("button", { name: "Filtrar" }),
    );

    expect(stores.flowStore.getState().state.flow.nodes.map(({ type }) => type)).toEqual([
      "core.filter",
    ]);
  });
});

describe("Mis flujos section", () => {
  it("lists the saved flows", async () => {
    await renderSection("flows");

    expect(flowCard("Ventas")).toBeTruthy();
  });

  it("opens a saved flow", async () => {
    const { stores } = await renderSection("flows");

    await userEvent.click(within(flowCard("Ventas")).getByRole("button", { name: "Abrir" }));

    await waitFor(() => {
      expect(stores.savedFlowStore.getState().currentId).toBe("one");
    });
  });

  it("keeps the panel open after opening a flow", async () => {
    const { stores } = await renderSection("flows");

    await userEvent.click(within(flowCard("Ventas")).getByRole("button", { name: "Abrir" }));
    await waitFor(() => {
      expect(stores.savedFlowStore.getState().currentId).toBe("one");
    });

    expect(panel("Mis flujos")).toBeTruthy();
  });

  it("creates and opens a new empty flow", async () => {
    const stores = await seededStores();
    await stores.savedFlowStore.getState().openFlow("one");
    await renderSection("flows", stores);

    await userEvent.click(within(panel("Mis flujos")).getByRole("button", { name: "Nuevo flujo" }));

    await waitFor(() => {
      expect({
        currentId: stores.savedFlowStore.getState().currentId,
        nodes: stores.flowStore.getState().state.flow.nodes,
      }).toEqual({ currentId: undefined, nodes: [] });
    });
  });

  it("duplicates a saved flow", async () => {
    await renderSection("flows");

    await userEvent.click(within(flowCard("Ventas")).getByRole("button", { name: "Duplicar" }));

    expect(
      await within(panel("Mis flujos")).findByRole("article", { name: "Ventas (copia)" }),
    ).toBeTruthy();
  });

  it("renames a saved flow", async () => {
    await renderSection("flows");
    const card = flowCard("Ventas");
    await userEvent.click(within(card).getByRole("button", { name: "Renombrar" }));
    fireEvent.change(within(card).getByRole("textbox"), { target: { value: "Compras" } });

    await userEvent.click(within(card).getByRole("button", { name: "Guardar nombre" }));

    expect(
      await within(panel("Mis flujos")).findByRole("article", { name: "Compras" }),
    ).toBeTruthy();
  });

  it("asks for confirmation before deleting a saved flow", async () => {
    const { stores } = await renderSection("flows");

    await userEvent.click(within(flowCard("Ventas")).getByRole("button", { name: "Borrar" }));

    expect((await stores.savedFlowStore.getState().library.listFlows()).value).toHaveLength(1);
  });

  it("deletes a saved flow once confirmed", async () => {
    const { stores } = await renderSection("flows");
    const card = flowCard("Ventas");
    await userEvent.click(within(card).getByRole("button", { name: "Borrar" }));

    await userEvent.click(within(card).getByRole("button", { name: "Confirmar borrado" }));
    await act(async () => {
      await stores.savedFlowStore.getState().refresh();
    });

    expect(within(panel("Mis flujos")).queryByRole("article", { name: "Ventas" })).toBeNull();
  });

  it("shows a flow another tab saved once the window gets focus", async () => {
    const stores = await seededStores();
    await renderSection("flows", stores);
    await stores.savedFlowStore.getState().library.saveFlow({
      id: "two",
      name: "Compras",
      flow: { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Compras" },
      files: {},
      updatedAt: 2,
    });

    fireEvent.focus(window);

    expect(
      await within(panel("Mis flujos")).findByRole("article", { name: "Compras" }),
    ).toBeTruthy();
  });

  it("exports a saved flow as a file", async () => {
    const downloads = recordDownloads();
    await renderSection("flows");

    await userEvent.click(within(flowCard("Ventas")).getByRole("button", { name: "Exportar" }));

    await waitFor(() => {
      expect(downloads.map(({ name }) => name)).toEqual(["Ventas.nodo.json"]);
    });
  });
});

describe("Mis nodos section", () => {
  async function storesWithInvalidNodeFlow() {
    const stores = await seededStores();
    await stores.savedFlowStore.getState().library.saveFlow({
      id: "invalid",
      name: "Incompleto",
      flow: {
        format: FLOW_FORMAT,
        nodes: [
          {
            id: "entry",
            type: FLOW_NODE.id,
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
    await stores.savedFlowStore.getState().refresh();
    return stores;
  }

  it("lists node flows with what they still need", async () => {
    const stores = await storesWithInvalidNodeFlow();
    await renderSection("my-nodes", stores);

    act(() => {
      stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [FLOW_NODE] });
    });

    expect(await within(panel("Mis nodos")).findByText("Agrega una «Salida de nodo»")).toBeTruthy();
  });

  it("opens a node flow", async () => {
    const stores = await storesWithInvalidNodeFlow();
    await renderSection("my-nodes", stores);
    act(() => {
      stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [FLOW_NODE] });
    });

    await userEvent.click(
      await within(panel("Mis nodos")).findByRole("button", { name: "Abrir flujo" }),
    );

    await waitFor(() => {
      expect(stores.savedFlowStore.getState().currentId).toBe("invalid");
    });
  });
});

describe("Datos section", () => {
  it("lists the stored files", async () => {
    await renderSection("data");

    expect(within(panel("Datos")).getByText("ventas.csv")).toBeTruthy();
  });
});

async function addCredential(credentials: HTMLElement, name: string, value: string) {
  await userEvent.type(within(credentials).getByRole("textbox", { name: "Nombre" }), name);
  await userEvent.type(within(credentials).getByLabelText("Valor"), value);
  await userEvent.click(within(credentials).getByRole("button", { name: "Agregar" }));
  return within(credentials).findByRole("article", { name });
}

describe("Credenciales section", () => {
  it("warns how credentials are stored", async () => {
    await renderSection("secrets");

    expect(
      within(panel("Credenciales")).getByText(
        "Se guardan sin cifrar en este navegador y nunca se incluyen en el flujo",
      ),
    ).toBeTruthy();
  });

  it("adds a password credential without displaying its value", async () => {
    const { stores } = await renderSection("secrets");
    const credentials = panel("Credenciales");

    await userEvent.type(within(credentials).getByRole("textbox", { name: "Nombre" }), "api-token");
    await userEvent.type(within(credentials).getByLabelText("Valor"), "hidden-token");
    await userEvent.click(within(credentials).getByRole("button", { name: "Agregar" }));

    const card = await within(credentials).findByRole("article", { name: "api-token" });
    expect({
      isShown: card.textContent.includes("hidden-token"),
      stored: (await stores.savedFlowStore.getState().library.readSecrets()).value,
    }).toEqual({ isShown: false, stored: [{ name: "api-token", value: "hidden-token" }] });
  });

  it("replaces the value of an existing credential", async () => {
    const { stores } = await renderSection("secrets");
    const credentials = panel("Credenciales");
    await addCredential(credentials, "api-token", "hidden-token");

    await userEvent.type(within(credentials).getByRole("textbox", { name: "Nombre" }), "api-token");
    await userEvent.type(within(credentials).getByLabelText("Valor"), "replacement");
    await userEvent.click(within(credentials).getByRole("button", { name: "Reemplazar" }));

    expect((await stores.savedFlowStore.getState().library.readSecrets()).value).toEqual([
      { name: "api-token", value: "replacement" },
    ]);
  });

  it("deletes a credential once confirmed", async () => {
    await renderSection("secrets");
    const card = await addCredential(panel("Credenciales"), "api-token", "hidden-token");

    await userEvent.click(within(card).getByRole("button", { name: "Borrar" }));
    await userEvent.click(within(card).getByRole("button", { name: "Confirmar borrado" }));

    expect(
      await within(panel("Credenciales")).findByText("Todavía no hay credenciales guardadas."),
    ).toBeTruthy();
  });

  it("asks for the value in a password field", async () => {
    await renderSection("secrets");

    expect(within(panel("Credenciales")).getByLabelText("Valor").getAttribute("type")).toBe(
      "password",
    );
  });
});

describe("Agente section mockup", () => {
  it("says the agent is a mockup", async () => {
    await renderSection("agent");

    expect(
      within(panel("Agente")).getByText(/Maqueta: el agente todavía no está conectado\./),
    ).toBeTruthy();
  });

  it("shows proposals whose Aceptar and Rechazar buttons are disabled", async () => {
    await renderSection("agent");

    const buttons = [
      ...within(panel("Agente")).getAllByRole("button", { name: "Aceptar" }),
      ...within(panel("Agente")).getAllByRole("button", { name: "Rechazar" }),
    ];

    expect(buttons.map((button) => button.hasAttribute("disabled"))).toEqual(
      buttons.map(() => true),
    );
  });

  it("pairs each proposal's Aceptar with a Rechazar", async () => {
    await renderSection("agent");

    expect(within(panel("Agente")).getAllByRole("button", { name: "Aceptar" }).length).toBe(
      within(panel("Agente")).getAllByRole("button", { name: "Rechazar" }).length,
    );
  });

  it("disables the message field", async () => {
    await renderSection("agent");

    expect(
      within(panel("Agente"))
        .getByRole("textbox", { name: "Escribe al agente" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("says the agent works on a draft", async () => {
    await renderSection("agent");

    expect(within(panel("Agente")).getByText(/Trabaja en un borrador/)).toBeTruthy();
  });

  it("offers a disabled Ver en el lienzo for each proposal", async () => {
    await renderSection("agent");

    const show = within(panel("Agente")).getAllByRole("button", { name: "Ver en el lienzo" });

    expect({
      count: show.length,
      disabled: show.map((button) => button.hasAttribute("disabled")),
    }).toEqual({
      count: within(panel("Agente")).getAllByRole("button", { name: "Aceptar" }).length,
      disabled: show.map(() => true),
    });
  });

  it.each(["Aceptar los 3", "Descartar borrador"])(
    "offers a disabled %s button for the whole draft",
    async (name) => {
      await renderSection("agent");

      expect(within(panel("Agente")).getByRole("button", { name }).hasAttribute("disabled")).toBe(
        true,
      );
    },
  );
});
