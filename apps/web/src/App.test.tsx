import type { NepParams } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAppStores } from "./app-stores.ts";
import { CATALOG, edgeOf, FILTER, flowOf, nodeOf, SAMPLE } from "./canvas/canvas-fixtures.ts";
import { ANA, createSeededHub, createTestHub } from "./hub/hub-pages-fixtures.tsx";
import { renderApp } from "./testing/render-app.tsx";
import { stubResizeObserver } from "./testing/stub-resize-observer.ts";

const SECTIONS = [
  { button: "Nodos", panel: "Biblioteca de nodos", heading: "Nodos", id: "nodes" },
  { button: "Mis flujos", panel: "Mis flujos", heading: "Mis flujos", id: "flows" },
  { button: "Mis nodos", panel: "Mis nodos", heading: "Mis nodos", id: "my-nodes" },
  { button: "Datos", panel: "Datos", heading: "Datos", id: "data" },
  { button: "Credenciales", panel: "Credenciales", heading: "Credenciales", id: "secrets" },
  { button: "Agente", panel: "Agente", heading: "Agente", id: "agent" },
] as const;

const PANEL_NAMES = SECTIONS.map(({ panel }) => panel);

const rail = () => screen.getByRole("navigation", { name: "Secciones del editor" });

const railButton = (name: string) => within(rail()).getByRole("button", { name });

const pressedSections = () =>
  SECTIONS.filter(
    ({ button }) =>
      within(rail()).queryByRole("button", { name: button })?.getAttribute("aria-pressed") ===
      "true",
  ).map(({ button }) => button);

const shownPanels = () =>
  PANEL_NAMES.filter((name) => screen.queryByRole("complementary", { name }) !== null);

const isBefore = (first: Element, second: Element) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

/** The engine connects after the hub has answered, so by then any hub page would be shown. */
async function waitForEngine() {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Ejecutar/ }).hasAttribute("disabled")).toBe(false);
  });
}

const sidePanel = (name: string) => screen.getByRole("complementary", { name });

const opensInNewTab = (link: HTMLElement) => ({
  href: link.getAttribute("href"),
  target: link.getAttribute("target"),
  isNoopener: link.getAttribute("rel")?.split(" ").includes("noopener"),
});

async function signedInHub() {
  const hub = createTestHub();
  await hub.signIn({ kind: "email", email: ANA.handle });
  return hub;
}

/** Mis flujos and Agente need an account, so the sections that use them render signed in. */
async function renderSignedIn(options: Parameters<typeof renderApp>[0] = {}) {
  const rendered = renderApp({ ...options, hub: await signedInHub() });
  await within(rail()).findByRole("button", { name: "Agente" });
  return rendered;
}

const findSidePanel = (name: string) => screen.findByRole("complementary", { name });

async function openProfileLink() {
  renderApp({ hub: await signedInHub() });
  await userEvent.click(await screen.findByRole("button", { name: "Cuenta de Ana Pérez" }));
  return screen.getByRole("link", { name: "Mi perfil" });
}

async function publishFromShareMenu() {
  renderApp({ hub: await signedInHub() });
  await userEvent.click(await screen.findByRole("button", { name: "Compartir" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Publicar en el hub…" }));
  const dialog = await screen.findByRole("dialog", { name: "Publicar en el hub" });
  await userEvent.clear(within(dialog).getByRole("textbox", { name: "Título" }));
  await userEvent.type(within(dialog).getByRole("textbox", { name: "Título" }), "Ventas");
  await waitFor(() => {
    expect(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Versión" }).value).toBe(
      "0.1.0",
    );
  });
  await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
  return within(dialog).findByRole("link", { name: "Ver en el hub" });
}

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("App activity rail", () => {
  it("offers one toggle button per section", async () => {
    await renderSignedIn();

    expect(SECTIONS.map(({ button }) => railButton(button).hasAttribute("aria-pressed"))).toEqual(
      SECTIONS.map(() => true),
    );
  });

  it("lists the sections before the hub link and the theme control", async () => {
    await renderSignedIn();
    const controls = [
      ...SECTIONS.map(({ button }) => railButton(button)),
      within(rail()).getByRole("link", { name: "Abrir el hub en otra pestaña" }),
      within(rail()).getByRole("button", { name: "Tema" }),
    ];

    const inOrder = controls.slice(1).map((control, index) => {
      const previous = controls[index];
      return previous !== undefined && isBefore(previous, control);
    });

    expect(inOrder).toEqual(controls.slice(1).map(() => true));
  });

  it("opens the hub in another tab", () => {
    renderApp();

    const link = within(rail()).getByRole("link", { name: "Abrir el hub en otra pestaña" });

    expect({
      href: link.getAttribute("href"),
      target: link.getAttribute("target"),
      isNoopener: link.getAttribute("rel")?.split(" ").includes("noopener"),
    }).toEqual({ href: "/hub", target: "_blank", isNoopener: true });
  });

  it("offers the light, dark and system themes in its Tema menu", async () => {
    renderApp();

    await userEvent.click(within(rail()).getByRole("button", { name: "Tema" }));

    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "Claro",
      "Oscuro",
      "Sistema",
    ]);
  });

  it("applies and remembers the theme chosen in the Tema menu", async () => {
    const { preferences } = renderApp();

    await userEvent.click(within(rail()).getByRole("button", { name: "Tema" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Oscuro" }));

    expect({
      applied: document.documentElement.dataset["theme"],
      stored: preferences.current().theme,
    }).toEqual({ applied: "dark", stored: "dark" });
  });
});

describe("App side panel", () => {
  it("shows the node library by default", () => {
    renderApp();

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: ["Nodos"],
      shown: ["Biblioteca de nodos"],
    });
  });

  it.each(SECTIONS)("shows the $panel panel when $button is chosen", async (section) => {
    await renderSignedIn({
      preferences: { sideSection: section.id === "nodes" ? "agent" : "nodes" },
    });
    await findSidePanel(section.id === "nodes" ? "Agente" : "Biblioteca de nodos");

    await userEvent.click(railButton(section.button));

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: [section.button],
      shown: [section.panel],
    });
  });

  it.each(SECTIONS)("heads the $panel panel with $heading", async (section) => {
    await renderSignedIn({ preferences: { sideSection: section.id } });

    const panel = await findSidePanel(section.panel);

    expect(within(panel).getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
  });

  it.each(SECTIONS)("offers to hide the $panel panel", async (section) => {
    await renderSignedIn({ preferences: { sideSection: section.id } });

    const panel = await findSidePanel(section.panel);

    expect(within(panel).getByRole("button", { name: "Ocultar panel" })).toBeTruthy();
  });

  it("hides the panel when the active section is chosen again", async () => {
    renderApp();

    await userEvent.click(railButton("Nodos"));

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: [],
      shown: [],
    });
  });

  it("hides the panel with Ocultar panel", async () => {
    renderApp();

    await userEvent.click(
      within(sidePanel("Biblioteca de nodos")).getByRole("button", { name: "Ocultar panel" }),
    );

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: [],
      shown: [],
    });
  });

  it("reopens the hidden panel on the section chosen", async () => {
    renderApp();
    await userEvent.click(railButton("Nodos"));

    await userEvent.click(railButton("Datos"));

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: ["Datos"],
      shown: ["Datos"],
    });
  });

  it("reopens the hidden panel when its last section is chosen again", async () => {
    renderApp();
    await userEvent.click(railButton("Nodos"));

    await userEvent.click(railButton("Nodos"));

    expect(shownPanels()).toEqual(["Biblioteca de nodos"]);
  });

  it("keeps the parameters panel apart from the side panel", async () => {
    renderApp();

    await userEvent.click(railButton("Nodos"));

    expect(screen.getByRole("complementary", { name: "Parámetros" })).toBeTruthy();
  });

  it("has no Mis flujos dialog", async () => {
    await renderSignedIn();

    await userEvent.click(railButton("Mis flujos"));

    expect(screen.queryByRole("dialog", { name: "Mis flujos" })).toBeNull();
  });
});

describe("App side panel focus", () => {
  it("moves focus to the shown section's rail button when the panel is hidden", async () => {
    renderApp();

    await userEvent.click(
      within(sidePanel("Biblioteca de nodos")).getByRole("button", { name: "Ocultar panel" }),
    );

    expect(document.activeElement).toBe(railButton("Nodos"));
  });

  it("returns focus to the rail button of a section other than the default", async () => {
    renderApp({ preferences: { sideSection: "data" } });

    await userEvent.click(
      within(sidePanel("Datos")).getByRole("button", { name: "Ocultar panel" }),
    );

    expect(document.activeElement).toBe(railButton("Datos"));
  });
});

describe("App side panel preferences", () => {
  it("starts on the stored section", () => {
    renderApp({ preferences: { sideSection: "secrets" } });

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: ["Credenciales"],
      shown: ["Credenciales"],
    });
  });

  it("starts hidden when the panel was hidden", () => {
    renderApp({ preferences: { sideSection: "data", isSidePanelOpen: false } });

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: [],
      shown: [],
    });
  });

  it("remembers the section chosen", async () => {
    const { preferences } = await renderSignedIn();

    await userEvent.click(railButton("Agente"));

    expect({
      section: preferences.current().sideSection,
      isOpen: preferences.current().isSidePanelOpen,
    }).toEqual({ section: "agent", isOpen: true });
  });

  it("remembers that the panel was hidden", async () => {
    const { preferences } = renderApp();

    await userEvent.click(railButton("Nodos"));

    expect(preferences.current().isSidePanelOpen).toBe(false);
  });

  it("reopens on the remembered section after being hidden", async () => {
    await renderSignedIn({ preferences: { sideSection: "flows", isSidePanelOpen: false } });

    await userEvent.click(railButton("Mis flujos"));

    expect(shownPanels()).toEqual(["Mis flujos"]);
  });
});

describe("App workspace", () => {
  it("shows the flow actions bar", () => {
    renderApp();

    expect(screen.getByRole("banner", { name: "Acciones del flujo" })).toBeTruthy();
  });

  it.each([
    { path: "/hub", page: "Hub" },
    { path: "/hub/ana/ventas", page: "Ventas por región" },
    { path: "/u/ana", page: "Ana Pérez" },
  ])("never shows the hub page at $path", async ({ path, page }) => {
    renderApp({ path, hub: await createSeededHub() });

    await waitForEngine();

    expect({
      canvas: screen.queryByRole("region", { name: "Lienzo del flujo" }) !== null,
      hubPage: screen.queryByRole("heading", { level: 1, name: page }) !== null,
      hubSearch: screen.queryByLabelText("Buscar en el hub") !== null,
    }).toEqual({ canvas: true, hubPage: false, hubSearch: false });
  });
});

describe("App hub links", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("opens the profile from the account menu in another tab", async () => {
    const link = await openProfileLink();

    expect(opensInNewTab(link)).toEqual({ href: "/u/ana", target: "_blank", isNoopener: true });
  });

  it("stays on the editor when the profile link is clicked", async () => {
    const link = await openProfileLink();

    await userEvent.click(link);

    expect(window.location.pathname).toBe("/");
  });

  it("opens the new publication in another tab", async () => {
    const link = await publishFromShareMenu();

    expect(opensInNewTab(link)).toEqual({
      href: "/hub/ana/ventas",
      target: "_blank",
      isNoopener: true,
    });
  });

  it("stays on the editor when the publication link is clicked", async () => {
    const link = await publishFromShareMenu();

    await userEvent.click(link);

    expect(window.location.pathname).toBe("/");
  });
});

describe("App parameters inspector", () => {
  it("asks the engine to run only the selected node", async () => {
    const runs: NepParams<"flow.run">[] = [];
    const stores = createAppStores(
      flowOf(
        [nodeOf("s", SAMPLE.id), nodeOf("f", FILTER.id)],
        [edgeOf("e1", ["s", "out"], ["f", "in"])],
      ),
    );
    renderApp({
      stores,
      handlers: {
        "nodes.list": () => ({ nodes: [...CATALOG] }),
        "flow.run": (params) => {
          runs.push(params);
          return { runId: "r1" };
        },
      },
    });
    await waitForEngine();
    act(() => {
      stores.selectionStore.getState().select(["f"]);
    });

    await userEvent.click(
      within(sidePanel("Parámetros")).getByRole("button", { name: "Ejecutar este nodo" }),
    );

    await waitFor(() => {
      expect(runs.map(({ targets }) => targets)).toEqual([["f"]]);
    });
  });
});
