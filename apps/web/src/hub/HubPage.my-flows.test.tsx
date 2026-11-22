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
      <HubPage text="" onOpenEditor={onOpenEditor} onOpenCopy={onOpenCopy} />
    </HubContext>,
    stores,
  );
  return { hub, stores, library, onOpenEditor, onOpenCopy };
}

async function renderSignedInWithFlows(flows: ReadonlyArray<SavedFlow>) {
  return renderWithFlows(flows, await signedInHub());
}

const exploreGroup = () => screen.getByRole("radiogroup", { name: "Explorar" });
const exploreOption = (name: string) => within(exploreGroup()).getByRole("radio", { name });
const isChecked = (radio: HTMLElement) =>
  radio instanceof HTMLInputElement ? radio.checked : radio.getAttribute("aria-checked") === "true";

async function chooseMyFlows() {
  await userEvent.click(await within(exploreGroup()).findByRole("radio", { name: "Mis flujos" }));
}

async function showMyFlows(flows: ReadonlyArray<SavedFlow>) {
  const rendered = await renderSignedInWithFlows(flows);
  await chooseMyFlows();
  return rendered;
}

const findCard = (name: string) => screen.findByRole("article", { name });
const buttonIn = (card: HTMLElement, name: string) => within(card).getByRole("button", { name });
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

describe("HubPage Explorar with Mis flujos", () => {
  it("offers Para ti, Recientes, Mis flujos and Mis publicaciones, in order, when signed in", async () => {
    await renderSignedInWithFlows([]);
    await within(exploreGroup()).findByRole("radio", { name: "Mis flujos" });

    const radios = within(exploreGroup()).getAllByRole("radio");

    expect(radios).toEqual([
      exploreOption("Para ti"),
      exploreOption("Recientes"),
      exploreOption("Mis flujos"),
      exploreOption("Mis publicaciones"),
    ]);
  });

  it("does not offer Mis flujos when signed out", async () => {
    await renderWithFlows([]);
    await screen.findByRole("heading", { name: "Para ti" });

    const radios = within(exploreGroup()).getAllByRole("radio");

    expect(radios).toEqual([exploreOption("Para ti"), exploreOption("Recientes")]);
  });

  it("offers Mis flujos once the user signs in", async () => {
    const { hub } = await renderWithFlows([]);

    await act(async () => {
      await hub.signIn({ kind: "email", email: "ana" });
    });

    expect(await within(exploreGroup()).findByRole("radio", { name: "Mis flujos" })).toBeTruthy();
  });

  it("goes back to Para ti when the user signs out from Mis flujos", async () => {
    const { hub } = await showMyFlows([VENTAS]);
    await findCard("Ventas");

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect({
        isForYouChosen: isChecked(exploreOption("Para ti")),
        myFlowsOffered: within(exploreGroup()).queryByRole("radio", { name: "Mis flujos" }),
        forYouSection: screen.queryByRole("heading", { name: "Para ti" }) !== null,
      }).toEqual({ isForYouChosen: true, myFlowsOffered: null, forYouSection: true });
    });
  });
});

describe("HubPage Mis flujos view", () => {
  it("heads the view Mis flujos", async () => {
    await showMyFlows([VENTAS]);

    expect(await screen.findByRole("heading", { level: 2, name: "Mis flujos" })).toBeTruthy();
  });

  it("hides the Para ti section", async () => {
    await showMyFlows([VENTAS]);

    await findCard("Ventas");

    expect(screen.queryByRole("heading", { name: "Para ti" })).toBeNull();
  });

  it("opens a new flow in the editor from Nuevo flujo", async () => {
    const { onOpenEditor } = await showMyFlows([]);

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo flujo" }));

    expect(onOpenEditor.mock.calls).toEqual([[{ kind: "new" }]]);
  });

  it("shows one card per saved flow of the account, most recent first", async () => {
    await showMyFlows([VENTAS, PUBLISHED, CHANGED]);

    await findCard("Ventas");

    expect({
      cards: screen.getAllByRole("article").length,
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

  it("renames the flow", async () => {
    const user = userEvent.setup();
    await showMyFlows([VENTAS]);
    const card = await findCard("Ventas");
    await user.click(buttonIn(card, "Renombrar"));
    const name = within(card).getByRole("textbox", { name: "Nombre del flujo" });
    await user.clear(name);
    await user.type(name, "Ventas anuales");

    await user.click(buttonIn(card, "Guardar nombre"));

    expect(await findCard("Ventas anuales")).toBeTruthy();
  });

  it("exports the flow as a file", async () => {
    const downloads = recordDownloads();
    await showMyFlows([VENTAS]);

    await userEvent.click(buttonIn(await findCard("Ventas"), "Exportar"));

    await waitFor(() => {
      expect(downloads.map(({ name }) => name)).toEqual(["Ventas.nodo.json"]);
    });
  });

  it("asks for confirmation before deleting the flow", async () => {
    const { library } = await showMyFlows([VENTAS]);

    await userEvent.click(buttonIn(await findCard("Ventas"), "Borrar"));

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
    await userEvent.click(buttonIn(card, "Borrar"));

    await userEvent.click(buttonIn(card, "Confirmar borrado"));

    await waitFor(() => {
      expect(screen.queryByRole("article", { name: "Ventas" })).toBeNull();
    });
    expect((await library.listFlows()).value).toEqual([]);
  });
});
