import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSeededHub } from "./hub/hub-pages-fixtures.tsx";
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
  SECTIONS.filter(({ button }) => railButton(button).getAttribute("aria-pressed") === "true").map(
    ({ button }) => button,
  );

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

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("App activity rail", () => {
  it("offers one toggle button per section", () => {
    renderApp();

    expect(SECTIONS.map(({ button }) => railButton(button).hasAttribute("aria-pressed"))).toEqual(
      SECTIONS.map(() => true),
    );
  });

  it("lists the sections before the hub link and the theme control", () => {
    renderApp();
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
    renderApp({ preferences: { sideSection: section.id === "nodes" ? "agent" : "nodes" } });

    await userEvent.click(railButton(section.button));

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: [section.button],
      shown: [section.panel],
    });
  });

  it.each(SECTIONS)("heads the $panel panel with $heading", (section) => {
    renderApp({ preferences: { sideSection: section.id } });

    expect(
      within(sidePanel(section.panel)).getByRole("heading", { level: 2, name: section.heading }),
    ).toBeTruthy();
  });

  it.each(SECTIONS)("offers to hide the $panel panel", (section) => {
    renderApp({ preferences: { sideSection: section.id } });

    expect(
      within(sidePanel(section.panel)).getByRole("button", { name: "Ocultar panel" }),
    ).toBeTruthy();
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
    renderApp();

    await userEvent.click(railButton("Mis flujos"));

    expect(screen.queryByRole("dialog", { name: "Mis flujos" })).toBeNull();
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
    const { preferences } = renderApp();

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
    renderApp({ preferences: { sideSection: "flows", isSidePanelOpen: false } });

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
