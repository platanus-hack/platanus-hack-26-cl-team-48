import type { Hub } from "@nodomics/hub";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ANA, createTestHub } from "./hub/hub-pages-fixtures.tsx";
import type { SideSection } from "./layout/workspace-preferences.ts";
import { renderApp } from "./testing/render-app.tsx";
import { stubResizeObserver } from "./testing/stub-resize-observer.ts";

const ACCOUNT_SECTIONS = ["Mis flujos", "Agente"];

const OPEN_SECTIONS = ["Nodos", "Mis nodos", "Datos", "Credenciales"];

const ALL_SECTIONS = ["Nodos", "Mis flujos", "Mis nodos", "Datos", "Credenciales", "Agente"];

const SIDE_PANELS = [
  "Biblioteca de nodos",
  "Mis flujos",
  "Mis nodos",
  "Datos",
  "Credenciales",
  "Agente",
];

const rail = () => screen.getByRole("navigation", { name: "Secciones del editor" });

const offeredSections = () =>
  ALL_SECTIONS.filter((name) => within(rail()).queryByRole("button", { name }) !== null);

const pressedSections = () =>
  ALL_SECTIONS.filter(
    (name) =>
      within(rail()).queryByRole("button", { name })?.getAttribute("aria-pressed") === "true",
  );

const shownPanels = () =>
  SIDE_PANELS.filter((name) => screen.queryByRole("complementary", { name }) !== null);

/** The engine connects after the hub has answered, so by then the profile is known. */
async function waitForEngine() {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Ejecutar/ }).hasAttribute("disabled")).toBe(false);
  });
}

async function signedInHub(): Promise<Hub> {
  const hub = createTestHub();
  await hub.signIn({ kind: "email", email: ANA.handle });
  return hub;
}

async function renderSignedOut(sideSection: SideSection = "nodes") {
  const hub = createTestHub();
  renderApp({ hub, preferences: { sideSection, isSidePanelOpen: true } });
  await waitForEngine();
  return hub;
}

async function renderSignedIn(sideSection: SideSection = "nodes") {
  const hub = await signedInHub();
  renderApp({ hub, preferences: { sideSection, isSidePanelOpen: true } });
  await within(rail()).findByRole("button", { name: "Agente" });
  return hub;
}

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("App activity rail without an account", () => {
  it("does not offer Mis flujos or Agente when signed out", async () => {
    await renderSignedOut();

    expect(
      ACCOUNT_SECTIONS.filter((name) => within(rail()).queryByRole("button", { name }) !== null),
    ).toEqual([]);
  });

  it("still offers Nodos, Mis nodos, Datos and Credenciales when signed out", async () => {
    await renderSignedOut();

    expect(offeredSections()).toEqual(OPEN_SECTIONS);
  });

  it("offers every section when signed in", async () => {
    await renderSignedIn();

    expect(offeredSections()).toEqual(ALL_SECTIONS);
  });

  it("offers Mis flujos and Agente once the user signs in with the editor open", async () => {
    const hub = await renderSignedOut();

    await act(async () => {
      await hub.signIn({ kind: "email", email: ANA.handle });
    });

    await waitFor(() => {
      expect(offeredSections()).toEqual(ALL_SECTIONS);
    });
  });

  it("stops offering Mis flujos and Agente once the user signs out with the editor open", async () => {
    const hub = await renderSignedIn();

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect(offeredSections()).toEqual(OPEN_SECTIONS);
    });
  });
});

describe("App side panel without an account", () => {
  it.each<{ readonly section: SideSection; readonly name: string }>([
    { section: "flows", name: "Mis flujos" },
    { section: "agent", name: "Agente" },
  ])(
    "shows the node library instead of the remembered $name section when signed out",
    async ({ section }) => {
      await renderSignedOut(section);

      expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
        pressed: ["Nodos"],
        shown: ["Biblioteca de nodos"],
      });
    },
  );

  it("shows the remembered Mis flujos section when signed in", async () => {
    await renderSignedIn("flows");

    expect(await screen.findByRole("complementary", { name: "Mis flujos" })).toBeTruthy();
  });

  it.each<{ readonly section: SideSection; readonly name: string }>([
    { section: "flows", name: "Mis flujos" },
    { section: "agent", name: "Agente" },
  ])(
    "shows the node library instead of the $name section when the user signs out",
    async ({ section, name }) => {
      const hub = await renderSignedIn(section);
      await screen.findByRole("complementary", { name });

      await act(async () => {
        await hub.signOut();
      });

      await waitFor(() => {
        expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
          pressed: ["Nodos"],
          shown: ["Biblioteca de nodos"],
        });
      });
    },
  );
});
