import type { Hub } from "@nodomics/hub";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ANA, createTestHub } from "./hub/hub-pages-fixtures.tsx";
import type { SideSection } from "./layout/workspace-preferences.ts";
import { renderApp } from "./testing/render-app.tsx";
import { stubResizeObserver } from "./testing/stub-resize-observer.ts";

const ACCOUNT_SECTIONS = ["Agente"];

const OPEN_SECTIONS = ["Nodos", "Mis nodos", "Datos", "Credenciales"];

const ALL_SECTIONS = ["Nodos", "Mis nodos", "Datos", "Credenciales", "Agente"];

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
  it("does not offer Agente when signed out", async () => {
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

  it.each([
    { account: "signed out", render: renderSignedOut },
    { account: "signed in", render: renderSignedIn },
  ])("never offers Mis flujos when $account", async ({ render }) => {
    await render();

    expect(within(rail()).queryByRole("button", { name: "Mis flujos" })).toBeNull();
  });

  it("offers Agente once the user signs in with the editor open", async () => {
    const hub = await renderSignedOut();

    await act(async () => {
      await hub.signIn({ kind: "email", email: ANA.handle });
    });

    await waitFor(() => {
      expect(offeredSections()).toEqual(ALL_SECTIONS);
    });
  });

  it("stops offering Agente once the user signs out with the editor open", async () => {
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
  it("shows the node library instead of the remembered Agente section when signed out", async () => {
    await renderSignedOut("agent");

    expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
      pressed: ["Nodos"],
      shown: ["Biblioteca de nodos"],
    });
  });

  it("shows the remembered Agente section when signed in", async () => {
    await renderSignedIn("agent");

    expect(await screen.findByRole("complementary", { name: "Agente" })).toBeTruthy();
  });

  it("shows the node library instead of the Agente section when the user signs out", async () => {
    const hub = await renderSignedIn("agent");
    await screen.findByRole("complementary", { name: "Agente" });

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect({ pressed: pressedSections(), shown: shownPanels() }).toEqual({
        pressed: ["Nodos"],
        shown: ["Biblioteca de nodos"],
      });
    });
  });
});
