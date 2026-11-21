import type { Hub } from "@nodomics/hub";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { nodeOf } from "../canvas/canvas-fixtures.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import { HubContext } from "../hub/hub-context.ts";
import { ANA, createTestHub } from "../hub/hub-pages-fixtures.tsx";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { Toolbar } from "./Toolbar.tsx";

const entry = (id: string, label: string): EngineEntry => ({
  id,
  label,
  badge: "browser",
  connect: () => startFakeEngine().transport,
});

const ENGINES = [entry("mock", "Simulado"), entry("local", "Python local")];

const HUB_PATHS = ["/hub", "/hub/ana/ventas", "/u/ana"];

type Setup = {
  readonly path?: string;
  readonly hub?: Hub;
  readonly children?: ReactNode;
};

function renderToolbar({ path = "/", hub = createTestHub(), children }: Setup = {}) {
  window.history.pushState(null, "", path);
  const picked: EngineEntry[] = [];
  const rendered = renderWithStores(
    <HubContext value={hub}>
      <Toolbar
        engines={ENGINES}
        engine={ENGINES[0] ?? entry("none", "")}
        onEngineChange={(engine) => picked.push(engine)}
      >
        {children}
      </Toolbar>
    </HubContext>,
  );
  return { picked, ...rendered };
}

const sections = () => screen.getByRole("navigation", { name: "Secciones" });

const sectionLink = (name: string) => within(sections()).getByRole("link", { name });

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Toolbar", () => {
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
});

describe("Toolbar sections", () => {
  it("links to the editor and to the hub", () => {
    renderToolbar();

    expect({
      editor: sectionLink("Editor").getAttribute("href"),
      hub: sectionLink("Hub").getAttribute("href"),
    }).toEqual({ editor: "/", hub: "/hub" });
  });

  it("marks the editor as the current section in the editor", () => {
    renderToolbar();

    expect({
      editor: sectionLink("Editor").getAttribute("aria-current"),
      hub: sectionLink("Hub").getAttribute("aria-current"),
    }).toEqual({ editor: "page", hub: null });
  });

  it("marks the hub as the current section in the hub", () => {
    renderToolbar({ path: "/hub" });

    expect({
      editor: sectionLink("Editor").getAttribute("aria-current"),
      hub: sectionLink("Hub").getAttribute("aria-current"),
    }).toEqual({ editor: null, hub: "page" });
  });
});

describe("Toolbar in the editor", () => {
  it("shows the flow name field and Mis flujos", () => {
    renderToolbar();

    expect({
      name: screen.queryByRole("textbox", { name: "Nombre del flujo" }) !== null,
      savedFlows: screen.queryByRole("button", { name: "Mis flujos" }) !== null,
    }).toEqual({ name: true, savedFlows: true });
  });

  it("shows the editing, running and sharing controls", () => {
    renderToolbar();

    expect({
      undo: screen.queryByRole("button", { name: "Deshacer" }) !== null,
      run: screen.queryByRole("button", { name: /Ejecutar/ }) !== null,
      share: screen.queryByRole("button", { name: "Compartir" }) !== null,
    }).toEqual({ undo: true, run: true, share: true });
  });

  it("renders its children", () => {
    renderToolbar({ children: <button type="button">Tema</button> });

    expect(screen.getByRole("button", { name: "Tema" })).toBeTruthy();
  });
});

describe.each(HUB_PATHS)("Toolbar in the hub at %s", (path) => {
  it("hides the editor controls", () => {
    renderToolbar({ path });

    expect({
      name: screen.queryByRole("textbox", { name: "Nombre del flujo" }) !== null,
      undo: screen.queryByRole("button", { name: "Deshacer" }) !== null,
      run: screen.queryByRole("button", { name: /Ejecutar/ }) !== null,
      share: screen.queryByRole("button", { name: "Compartir" }) !== null,
      engine: screen.queryByRole("combobox", { name: "Motor" }) !== null,
    }).toEqual({ name: false, undo: false, run: false, share: false, engine: false });
  });

  it("keeps the sections", () => {
    renderToolbar({ path });

    expect(screen.getByRole("navigation", { name: "Secciones" })).toBeTruthy();
  });

  it("keeps the account control", async () => {
    renderToolbar({ path });

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("renders its children", () => {
    renderToolbar({ path, children: <button type="button">Tema</button> });

    expect(screen.getByRole("button", { name: "Tema" })).toBeTruthy();
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
