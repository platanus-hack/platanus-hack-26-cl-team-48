import type { Hub } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { FILTER, flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import { HubContext } from "../hub/hub-context.ts";
import { ANA, createTestHub } from "../hub/hub-pages-fixtures.tsx";
import { RouteLinkTargetContext, type RouteLinkTarget } from "../routing/route-link-target.ts";
import { pathOf } from "../routing/routes.ts";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { recordDownloads } from "../testing/record-downloads.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { Toolbar } from "./Toolbar.tsx";

const entry = (id: string, label: string): EngineEntry => ({
  id,
  label,
  badge: "browser",
  connect: () => startFakeEngine().transport,
});

const ENGINES = [entry("mock", "Simulado"), entry("local", "Python local")];

const OPTIONS_ITEMS = ["Nuevo flujo", "Importar archivo…", "Exportar archivo"];

const EDITOR_FLOW: Flow = { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Ventas" };

const IMPORTED_FLOW: Flow = { ...flowOf([nodeOf("imported", FILTER.id)]), name: "Importado" };

type Setup = {
  readonly hub?: Hub;
  readonly stores?: AppStores;
  readonly linkTarget?: RouteLinkTarget;
};

function renderToolbar({
  hub = createTestHub(),
  stores = createAppStores(),
  linkTarget = "same-tab",
}: Setup = {}) {
  const picked: EngineEntry[] = [];
  const rendered = renderWithStores(
    <HubContext value={hub}>
      <RouteLinkTargetContext value={linkTarget}>
        <Toolbar
          engines={ENGINES}
          engine={ENGINES[0] ?? entry("none", "")}
          onEngineChange={(engine) => picked.push(engine)}
        />
      </RouteLinkTargetContext>
    </HubContext>,
    stores,
  );
  return { picked, ...rendered };
}

async function storesWithOpenSavedFlow() {
  const stores = createAppStores(EDITOR_FLOW);
  const { library, refresh, openFlow } = stores.savedFlowStore.getState();
  await library.saveFlow({ id: "one", name: "Ventas", flow: EDITOR_FLOW, files: {}, updatedAt: 1 });
  await refresh();
  await openFlow("one");
  return stores;
}

const header = () => screen.getByRole("banner", { name: "Acciones del flujo" });

const optionsButton = () => screen.getByRole("button", { name: "Opciones del flujo" });

async function openOptions() {
  await userEvent.click(optionsButton());
  return screen.findByRole("menu", { name: "Opciones del flujo" });
}

async function chooseOption(name: string) {
  const menu = await openOptions();
  await userEvent.click(within(menu).getByRole("menuitem", { name }));
}

const flowFile = (flow: Flow) =>
  new File([JSON.stringify(flow)], "importado.nodo.json", { type: "application/json" });

const isBefore = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Toolbar layout", () => {
  it("is a header named Acciones del flujo", () => {
    renderToolbar();

    expect(header().tagName).toBe("HEADER");
  });

  it("shows the Nodomics title as the main heading", () => {
    renderToolbar();

    expect(within(header()).getByRole("heading", { level: 1, name: "Nodomics" })).toBeTruthy();
  });

  it("opens the Hub home in a new tab when the Nodomics link is clicked from the editor", async () => {
    const editorPath = pathOf({ page: "workspace" });
    window.history.replaceState(null, "", editorPath);
    renderToolbar({ linkTarget: "new-tab" });
    const link = within(header()).getByRole("link", { name: /Nodomics/i });

    await userEvent.click(link);

    expect({
      href: link.getAttribute("href"),
      target: link.getAttribute("target"),
      path: window.location.pathname,
    }).toEqual({ href: pathOf({ page: "hub" }), target: "_blank", path: editorPath });
  });

  it("orders its controls from the flow to the account", async () => {
    renderToolbar();
    const controls = [
      within(header()).getByRole("heading", { level: 1, name: "Nodomics" }),
      within(header()).getByRole("textbox", { name: "Nombre del flujo" }),
      within(header()).getByRole("button", { name: "Opciones del flujo" }),
      within(header()).getByRole("button", { name: "Deshacer" }),
      within(header()).getByRole("button", { name: "Rehacer" }),
      within(header()).getByRole("combobox", { name: "Motor" }),
      within(header()).getByRole("button", { name: "Compartir" }),
      within(header()).getByRole("button", { name: /Ejecutar/ }),
      await within(header()).findByRole("button", { name: "Entrar" }),
    ];

    const pairs = controls.slice(1).map((control, index) => {
      const previous = controls[index];
      return previous !== undefined && isBefore(previous, control);
    });

    expect(pairs).toEqual(controls.slice(1).map(() => true));
  });

  it("has no sections navigation", () => {
    renderToolbar();

    expect(screen.queryByRole("navigation", { name: "Secciones" })).toBeNull();
  });

  it("has no links to the editor or the hub", () => {
    renderToolbar();

    expect({
      editor: screen.queryByRole("link", { name: "Editor" }),
      hub: screen.queryByRole("link", { name: "Hub" }),
    }).toEqual({ editor: null, hub: null });
  });

  it("has no Mis flujos button", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Mis flujos" })).toBeNull();
  });

  it("has no theme control", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Tema" })).toBeNull();
  });
});

describe("Toolbar flow name", () => {
  it("renames the open flow through an undoable command", () => {
    const { stores } = renderToolbar();

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del flujo" }), {
      target: { value: "Análisis" },
    });

    expect({
      name: stores.flowStore.getState().state.flow.name,
      undo: stores.flowStore.getState().state.undo.length,
    }).toEqual({ name: "Análisis", undo: 1 });
  });

  it("shows the saving status", () => {
    const { stores } = renderToolbar();

    act(() => {
      stores.savedFlowStore.setState({ status: "saving" });
    });

    expect(
      within(header())
        .getAllByRole("status")
        .map((status) => status.textContent),
    ).toContain("Guardando…");
  });
});

describe("Toolbar Opciones del flujo", () => {
  it("announces that the button opens a menu", () => {
    renderToolbar();

    expect(optionsButton().getAttribute("aria-haspopup")).toBe("menu");
  });

  it("starts closed", () => {
    renderToolbar();

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("offers a new flow, importing and exporting", async () => {
    renderToolbar();

    const menu = await openOptions();

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(OPTIONS_ITEMS);
  });

  it("closes with Escape", async () => {
    renderToolbar();
    await openOptions();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Toolbar Nuevo flujo", () => {
  it("opens a new empty flow", async () => {
    const stores = await storesWithOpenSavedFlow();
    renderToolbar({ stores });

    await chooseOption("Nuevo flujo");

    await waitFor(() => {
      expect({
        currentId: stores.savedFlowStore.getState().currentId,
        nodes: stores.flowStore.getState().state.flow.nodes,
      }).toEqual({ currentId: undefined, nodes: [] });
    });
  });

  it("closes the menu", async () => {
    renderToolbar();

    await chooseOption("Nuevo flujo");

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Toolbar Importar archivo…", () => {
  it("keeps a hidden file input labelled Importar that accepts flow files", () => {
    renderToolbar();

    const input = screen.getByLabelText<HTMLInputElement>("Importar");

    expect({ type: input.type, accept: input.accept }).toEqual({
      type: "file",
      accept: ".json,application/json",
    });
  });

  it("opens the file picker", async () => {
    renderToolbar();
    const opened: string[] = [];
    screen.getByLabelText("Importar").addEventListener("click", (event) => {
      event.preventDefault();
      opened.push("picker");
    });

    await chooseOption("Importar archivo…");

    expect(opened).toEqual(["picker"]);
  });

  it("loads the chosen flow file into the editor", async () => {
    const { stores } = renderToolbar();

    await userEvent.upload(screen.getByLabelText("Importar"), flowFile(IMPORTED_FLOW));

    await waitFor(() => {
      expect(stores.flowStore.getState().state.flow.nodes.map(({ id }) => id)).toEqual([
        "imported",
      ]);
    });
  });
});

describe("Toolbar Exportar archivo", () => {
  it("downloads the current flow as a file named after it", async () => {
    const downloads = recordDownloads();
    renderToolbar({ stores: createAppStores(EDITOR_FLOW) });

    await chooseOption("Exportar archivo");

    await waitFor(() => {
      expect(downloads.map(({ name }) => name)).toEqual(["Ventas.nodo.json"]);
    });
  });

  it("puts the current flow's nodes in the downloaded file", async () => {
    const downloads = recordDownloads();
    renderToolbar({ stores: createAppStores(EDITOR_FLOW) });

    await chooseOption("Exportar archivo");

    await waitFor(() => {
      expect(downloads).toHaveLength(1);
    });
    const [download] = downloads;
    const exported: unknown = JSON.parse((await download?.blob.text()) ?? "null");
    expect(exported).toMatchObject({ nodes: [{ id: "s", type: SAMPLE.id }] });
  });
});

describe("Toolbar editing and running", () => {
  it("lets the user pick another engine", async () => {
    const { picked } = renderToolbar();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motor" }), "local");

    expect(picked.map((engine) => engine.id)).toEqual(["local"]);
  });

  it("undoes and redoes flow edits", async () => {
    const { stores } = renderToolbar();
    stores.flowStore.getState().dispatch({ type: "node.add", node: nodeOf("a", "core.filter") });

    await userEvent.click(await screen.findByRole("button", { name: "Deshacer" }));
    const afterUndo = stores.flowStore.getState().state.flow.nodes.length;
    await userEvent.click(screen.getByRole("button", { name: "Rehacer" }));

    expect(afterUndo).toBe(0);
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
  });

  it("disables undo when there is nothing to undo", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: "Deshacer" }).hasAttribute("disabled")).toBe(true);
  });

  it("disables running while there is no engine connected", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: /Ejecutar/ }).hasAttribute("disabled")).toBe(true);
  });

  it("does not offer conversion even with several selected nodes", () => {
    const { stores } = renderToolbar();

    stores.selectionStore.getState().select(["a", "b"]);

    expect(screen.queryByRole("button", { name: "Convertir en nodo" })).toBeNull();
  });

  it("offers sharing through the Compartir menu", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: "Compartir" }).getAttribute("aria-haspopup")).toBe(
      "menu",
    );
  });
});

describe("Toolbar account", () => {
  it("offers to sign in when signed out", async () => {
    renderToolbar();

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("shows the account when signed in", async () => {
    const hub = createTestHub();
    await hub.signIn({ kind: "email", email: ANA.handle });

    renderToolbar({ hub });

    expect(
      await screen.findByRole("button", { name: `Cuenta de ${ANA.displayName}` }),
    ).toBeTruthy();
  });
});
