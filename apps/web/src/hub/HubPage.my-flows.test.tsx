import type { FlowStore, Hub } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudStores,
  createFlowsHub,
  savedFlowOf,
  signedInHub,
} from "../library/cloud-flow-fixtures.ts";
import type { SavedFlow } from "../library/flow-library.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { recordDownloads } from "../testing/record-downloads.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { HubContext } from "./hub-context.ts";
import { HubPage } from "./HubPage.tsx";

const PUBLISHED_AT_0_2_0 = {
  publicationId: "p-ventas",
  handle: "ana",
  slug: "ventas",
  version: "0.2.0",
  fingerprint: "huella-ventas",
};

const VENTAS = savedFlowOf("f-ventas", { name: "Ventas" });
const PUBLISHED = savedFlowOf("f-clima", {
  name: "Clima",
  published: { ...PUBLISHED_AT_0_2_0, hasChanges: false },
});
const CHANGED = savedFlowOf("f-compras", {
  name: "Compras",
  published: { ...PUBLISHED_AT_0_2_0, hasChanges: true },
});

/** Saves the flows in the account without refreshing the stores, as another tab would. */
async function renderWithFlows(
  flows: ReadonlyArray<SavedFlow>,
  hub: Hub & FlowStore = createFlowsHub(),
) {
  const { stores, library } = cloudStores(hub);
  for (const flow of flows) await library.saveFlow(flow);
  const onOpenEditor = vi.fn<(opening: EditorOpening) => void>();
  const onOpenCopy = vi.fn<(flow: Flow) => void>();
  renderWithStores(
    <HubContext value={hub}>
      <HubPage
        text=""
        onSearch={vi.fn<(text: string) => void>()}
        onOpenEditor={onOpenEditor}
        onOpenCopy={onOpenCopy}
      />
    </HubContext>,
    stores,
  );
  return { hub, stores, library, onOpenEditor, onOpenCopy };
}

async function renderSignedInWithFlows(flows: ReadonlyArray<SavedFlow>) {
  return renderWithFlows(flows, await signedInHub());
}

const tabList = () => screen.getByRole("tablist", { name: "Secciones del hub" });
const isSelected = (element: HTMLElement) => element.getAttribute("aria-selected") === "true";
const findMySpaceTab = () => within(tabList()).findByRole("tab", { name: "Mi espacio" });

async function openMySpace() {
  await userEvent.click(await findMySpaceTab());
}

async function showMyFlows(flows: ReadonlyArray<SavedFlow>) {
  const rendered = await renderSignedInWithFlows(flows);
  await openMySpace();
  return rendered;
}

const findCard = (name: string) => screen.findByRole("article", { name });
const buttonIn = (card: HTMLElement, name: string) => within(card).getByRole("button", { name });
const moreActionsOf = (card: HTMLElement) => within(card).getByText("Más acciones");
/** Rename, Export and Delete sit behind Más acciones, so it is opened first. */
async function moreActionIn(card: HTMLElement, name: string) {
  await userEvent.click(moreActionsOf(card));
  return buttonIn(card, name);
}
const myFlowsSection = async () => {
  const heading = await screen.findByRole("heading", { level: 2, name: "Mis flujos" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The Mis flujos heading is not inside a section");
  return section;
};
const isBefore = (first: HTMLElement, second: HTMLElement) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
/** The given card names in the order the cards are shown. */
const inShownOrder = (names: ReadonlyArray<string>) =>
  names
    .map((name) => ({ name, card: screen.getByRole("article", { name }) }))
    .sort((first, second) => (isBefore(first.card, second.card) ? -1 : 1))
    .map(({ name }) => name);

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("HubPage Mi espacio with Mis flujos", () => {
  it("offers Mi espacio when signed in", async () => {
    await renderSignedInWithFlows([]);

    expect(await findMySpaceTab()).toBeTruthy();
  });

  it("does not offer Mi espacio when signed out", async () => {
    await renderWithFlows([]);
    await screen.findByRole("tab", { name: "Descubrir" });

    expect(within(tabList()).queryByRole("tab", { name: "Mi espacio" })).toBeNull();
  });

  it("offers Mi espacio once the user signs in", async () => {
    const { hub } = await renderWithFlows([]);

    await act(async () => {
      await hub.signIn({ kind: "email", email: "ana" });
    });

    expect(await findMySpaceTab()).toBeTruthy();
  });

  it("goes back to Descubrir when the user signs out from Mi espacio", async () => {
    const { hub } = await showMyFlows([VENTAS]);
    await findCard("Ventas");

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect({
        isDiscoverSelected: isSelected(within(tabList()).getByRole("tab", { name: "Descubrir" })),
        mySpaceOffered: within(tabList()).queryByRole("tab", { name: "Mi espacio" }),
        flowCard: screen.queryByRole("article", { name: "Ventas" }),
      }).toEqual({ isDiscoverSelected: true, mySpaceOffered: null, flowCard: null });
    });
  });
});

describe("HubPage Mis flujos in Mi espacio", () => {
  it("heads the section Mis flujos", async () => {
    await showMyFlows([VENTAS]);

    expect(await screen.findByRole("heading", { level: 2, name: "Mis flujos" })).toBeTruthy();
  });

  it("hides the Para ti section", async () => {
    await showMyFlows([VENTAS]);

    await findCard("Ventas");

    expect(screen.queryByRole("heading", { name: "Para ti" })).toBeNull();
  });

  it("no longer offers Nuevo flujo inside Mis flujos", async () => {
    await showMyFlows([]);

    const section = await myFlowsSection();

    expect(within(section).queryByRole("button", { name: "Nuevo flujo" })).toBeNull();
  });

  it("shows one card per saved flow of the account, most recent first", async () => {
    await showMyFlows([VENTAS, PUBLISHED, CHANGED]);

    await findCard("Ventas");

    expect({
      cards: within(await myFlowsSection()).getAllByRole("article").length,
      order: inShownOrder(["Ventas", "Clima", "Compras"]),
    }).toEqual({ cards: 3, order: ["Compras", "Clima", "Ventas"] });
  });

  it("says there are no saved flows when the account has none", async () => {
    await showMyFlows([]);

    expect(await screen.findByText("Todavía no hay flujos guardados.")).toBeTruthy();
  });

  it("shows a flow that was never published as Sin publicar", async () => {
    await showMyFlows([VENTAS]);

    expect((await findCard("Ventas")).textContent).toContain("Sin publicar");
  });

  it("shows a published flow without changes with its version", async () => {
    await showMyFlows([PUBLISHED]);

    expect((await findCard("Clima")).textContent).toContain("Publicado · v0.2.0");
  });

  it("shows a published flow that changed since as Cambios sin publicar", async () => {
    await showMyFlows([CHANGED]);

    expect((await findCard("Compras")).textContent).toContain("Cambios sin publicar");
  });

  it("does not show a changed flow as published without changes", async () => {
    await showMyFlows([CHANGED]);

    expect((await findCard("Compras")).textContent).not.toContain("Publicado · v0.2.0");
  });
});

describe("HubPage Mis flujos card actions", () => {
  it("opens the flow in the editor from Entrar", async () => {
    const { onOpenEditor } = await showMyFlows([VENTAS]);

    await userEvent.click(buttonIn(await findCard("Ventas"), "Entrar"));

    expect(onOpenEditor.mock.calls).toEqual([[{ kind: "flow", id: "f-ventas" }]]);
  });

  it("makes Entrar the primary action", async () => {
    await showMyFlows([VENTAS]);

    const enter = buttonIn(await findCard("Ventas"), "Entrar");

    expect(enter.className).toContain("nd-btn-primary");
  });

  it("makes Copiar a secondary action after Entrar", async () => {
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");

    const copy = buttonIn(card, "Copiar");

    expect({
      isSecondary: copy.className.includes("nd-btn-secondary"),
      isAfterEnter: isBefore(buttonIn(card, "Entrar"), copy),
    }).toEqual({ isSecondary: true, isAfterEnter: true });
  });

  it("keeps Entrar and Copiar outside Más acciones", async () => {
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");

    const enter = buttonIn(card, "Entrar");

    expect({
      enter: enter.closest("details"),
      copy: buttonIn(card, "Copiar").closest("details"),
    }).toEqual({ enter: null, copy: null });
  });

  it("keeps Renombrar, Exportar and Borrar inside a closed Más acciones", async () => {
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");

    const details = moreActionsOf(card).closest("details");

    expect({
      isSummary: moreActionsOf(card).tagName,
      isOpen: details?.open,
      actions: ["Renombrar", "Exportar", "Borrar"].map(
        (name) => details?.contains(buttonIn(card, name)) ?? false,
      ),
    }).toEqual({ isSummary: "SUMMARY", isOpen: false, actions: [true, true, true] });
  });

  it("opens Más acciones when its summary is clicked", async () => {
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");

    await userEvent.click(moreActionsOf(card));

    expect(moreActionsOf(card).closest("details")?.open).toBe(true);
  });

  it("copies the flow into the account from Copiar", async () => {
    const { library } = await showMyFlows([VENTAS]);

    await userEvent.click(buttonIn(await findCard("Ventas"), "Copiar"));

    expect(await findCard("Ventas (copia)")).toBeTruthy();
    expect((await library.listFlows()).value.map(({ name }) => name).sort()).toEqual([
      "Ventas",
      "Ventas (copia)",
    ]);
  });

  it("leaves the copy of a published flow unpublished", async () => {
    await showMyFlows([PUBLISHED]);

    await userEvent.click(buttonIn(await findCard("Clima"), "Copiar"));

    expect((await findCard("Clima (copia)")).textContent).toContain("Sin publicar");
  });

  it("does not open the editor when copying", async () => {
    const { onOpenEditor } = await showMyFlows([VENTAS]);

    await userEvent.click(buttonIn(await findCard("Ventas"), "Copiar"));
    await findCard("Ventas (copia)");

    expect(onOpenEditor).not.toHaveBeenCalled();
  });

  it("renames the flow from Más acciones", async () => {
    const user = userEvent.setup();
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");
    await user.click(await moreActionIn(card, "Renombrar"));
    const name = within(card).getByRole("textbox", { name: "Nombre del flujo" });
    await user.clear(name);
    await user.type(name, "Ventas anuales");

    await user.click(buttonIn(card, "Guardar nombre"));

    expect(await findCard("Ventas anuales")).toBeTruthy();
  });

  it("exports the flow as a file from Más acciones", async () => {
    const downloads = recordDownloads();
    await showMyFlows([VENTAS]);

    await userEvent.click(await moreActionIn(await findCard("Ventas"), "Exportar"));

    await waitFor(() => {
      expect(downloads.map(({ name }) => name)).toEqual(["Ventas.nodo.json"]);
    });
  });

  it("asks for confirmation before deleting the flow from Más acciones", async () => {
    const { library } = await showMyFlows([VENTAS]);

    await userEvent.click(await moreActionIn(await findCard("Ventas"), "Borrar"));

    expect({
      confirm:
        within(await findCard("Ventas")).queryByRole("button", {
          name: "Confirmar borrado",
        }) !== null,
      flows: (await library.listFlows()).value.map(({ id }) => id),
    }).toEqual({ confirm: true, flows: ["f-ventas"] });
  });

  it("deletes the flow once confirmed", async () => {
    const { library } = await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");
    await userEvent.click(await moreActionIn(card, "Borrar"));

    await userEvent.click(buttonIn(card, "Confirmar borrado"));

    await waitFor(() => {
      expect(screen.queryByRole("article", { name: "Ventas" })).toBeNull();
    });
    expect((await library.listFlows()).value).toEqual([]);
  });
});
