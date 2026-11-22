import type { Hub } from "@nodomics/hub";
import { err } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Flow } from "@nodomics/protocol";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoresContext } from "../app-context.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { HubContext } from "./hub-context.ts";
import {
  ANA,
  CLEAN_NODE_MANIFEST,
  createSeededHub,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

const radioGroup = (name: string) => screen.getByRole("radiogroup", { name });
const radioIn = (group: string, name: string) =>
  within(radioGroup(group)).getByRole("radio", { name });
const kindChips = () => radioGroup("Tipo");
const kindChip = (name: string) => radioIn("Tipo", name);
const tabList = () => screen.getByRole("tablist", { name: "Secciones del hub" });
const tab = (name: string) => within(tabList()).getByRole("tab", { name });
const isSelected = (element: HTMLElement) => element.getAttribute("aria-selected") === "true";
const HERO_HEADING = "Analiza datos como LEGO, junto a quien sabe lo que tú no";
const isChecked = (radio: HTMLElement) =>
  radio instanceof HTMLInputElement ? radio.checked : radio.getAttribute("aria-checked") === "true";
const cardTitled = async (title: string) => {
  const link = await screen.findByRole("link", { name: title });
  const card = link.closest("article");
  if (card === null) throw new Error(`The link "${title}" is not inside a card`);
  return card;
};
const TITLES = ["Clima diario", "Limpiar texto", "Ventas por región"];
/** The titles of the listed cards, in alphabetical order. */
const cardTitles = () =>
  TITLES.filter((title) =>
    screen
      .queryAllByRole("article")
      .some((card) => within(card).queryByRole("link", { name: title }) !== null),
  );
const tagGroup = () => screen.getByRole("group", { name: "Etiquetas" });
const tagButton = (name: string) => within(tagGroup()).getByRole("button", { name });
const tagNames = () =>
  within(tagGroup())
    .getAllByRole("button")
    .map((button) => button.textContent.trim());
const sectionHeading = (name: string) => screen.queryByRole("heading", { level: 2, name });

/** Renders the page and hands back a way to change the text the header would send. */
function renderHubPage(hub: Hub, text = "") {
  const navigation = {
    onOpenEditor: vi.fn<(opening: EditorOpening) => void>(),
    onOpenCopy: vi.fn<(flow: Flow) => void>(),
    onSearch: vi.fn<(text: string) => void>(),
  };
  const rendered = renderWithHub(<HubPage text={text} {...navigation} />, hub);
  const showText = (next: string) => {
    rendered.rerender(
      <AppStoresContext value={rendered.stores}>
        <HubContext value={hub}>
          <HubPage text={next} {...navigation} />
        </HubContext>
      </AppStoresContext>,
    );
  };
  return { ...rendered, ...navigation, showText };
}

/** Ventas (comercial, mensual) and Limpiar (texto) by Ana; Clima (clima, mensual) by Beto. */
async function createTaggedHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf({ tags: ["mensual", "comercial"] }),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      description: "Quita espacios y acentos",
      tags: ["texto"],
      manifest: CLEAN_NODE_MANIFEST,
    }),
  ]);
  await publishAs(hub, "beto", [
    draftOf({
      slug: "clima",
      title: "Clima diario",
      description: "Temperaturas de cada día",
      tags: ["mensual", "clima"],
    }),
  ]);
  return hub;
}

async function createUntaggedHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [draftOf({ tags: [] })]);
  return hub;
}

async function signedInAs(hub: Hub, handle: string): Promise<Hub> {
  await hub.signIn({ kind: "email", email: handle });
  return hub;
}

/** Mi espacio is offered once the signed-in session has loaded. */
const findMySpaceTab = () => within(tabList()).findByRole("tab", { name: "Mi espacio" });

async function openMySpace() {
  await userEvent.click(await findMySpaceTab());
}

const filtersRegion = () => screen.getByRole("region", { name: "Filtros del hub" });

/** Ventas (comercial) by Ana as a flow and Limpiar (no tags) by Ana as a node. */
async function createHubWithUntaggedNode(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf({ tags: ["comercial"] }),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      description: "Quita espacios y acentos",
      tags: [],
      manifest: CLEAN_NODE_MANIFEST,
    }),
  ]);
  return hub;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("HubPage", () => {
  it("shows the Hub heading", async () => {
    renderHubPage(await createSeededHub());

    expect(screen.getByRole("heading", { level: 1, name: "Hub" })).toBeTruthy();
  });

  it("has no search field of its own", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect({
      searchbox: screen.queryByRole("searchbox"),
      labelled: screen.queryByLabelText("Buscar en el hub"),
    }).toEqual({ searchbox: null, labelled: null });
  });

  it("offers the kinds Todo, Flujos and Nodos as chips", async () => {
    renderHubPage(await createSeededHub());

    const radios = within(kindChips()).getAllByRole("radio");

    expect(radios).toEqual([kindChip("Todo"), kindChip("Flujos"), kindChip("Nodos")]);
  });

  it("starts with Todo chosen", async () => {
    renderHubPage(await createSeededHub());

    expect(["Todo", "Flujos", "Nodos"].map((name) => isChecked(kindChip(name)))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("chooses the chip the user clicks", async () => {
    const user = userEvent.setup();
    renderHubPage(await createSeededHub());

    await user.click(kindChip("Nodos"));

    expect(["Todo", "Flujos", "Nodos"].map((name) => isChecked(kindChip(name)))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("shows one card per publication", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("links each card's title to the publication page", async () => {
    renderHubPage(await createSeededHub());

    const link = await screen.findByRole("link", { name: "Ventas por región" });

    expect(link.getAttribute("href")).toBe("/hub/ana/ventas");
  });

  it("shows the description and the owner's handle on each card", async () => {
    renderHubPage(await createSeededHub());

    const card = await cardTitled("Clima diario");

    expect({
      description: within(card).queryByText("Temperaturas de cada día") !== null,
      owner: within(card).queryByText("@beto") !== null,
    }).toEqual({ description: true, owner: true });
  });

  it("shows only the publications matching the text it receives", async () => {
    renderHubPage(await createSeededHub(), "clima");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario"]);
    });
  });

  it("narrows the results when the text changes", async () => {
    const { showText } = renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    showText("clima");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario"]);
    });
  });

  it("shows only node publications when Nodos is chosen", async () => {
    const user = userEvent.setup();
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    await user.click(kindChip("Nodos"));

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1);
    });
    expect(screen.getByRole("link", { name: "Limpiar texto" })).toBeTruthy();
  });

  it("shows only flow publications when Flujos is chosen", async () => {
    const user = userEvent.setup();
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    await user.click(kindChip("Flujos"));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Limpiar texto" })).toBeNull();
    });
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("says nothing matches when the search finds no publication", async () => {
    renderHubPage(await createSeededHub(), "zzzz");

    expect(await screen.findByText("No hay publicaciones que coincidan")).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("says nothing matches when the hub is empty", async () => {
    renderHubPage(createTestHub());

    expect(await screen.findByText("No hay publicaciones que coincidan")).toBeTruthy();
  });

  it("shows an alert when the hub cannot be reached", async () => {
    const hub = {
      ...(await createSeededHub()),
      search: () => Promise.resolve(err({ kind: "unavailable" as const })),
    };
    renderHubPage(hub);

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("No se pudo cargar el hub");
  });

  it("goes to the publication within the app when its title is clicked", async () => {
    const user = userEvent.setup();
    renderHubPage(await createSeededHub());

    await user.click(await screen.findByRole("link", { name: "Ventas por región" }));

    expect(window.location.pathname).toBe("/hub/ana/ventas");
  });
});

describe("HubPage sections", () => {
  it("offers the Descubrir and Mi espacio tabs, in order, when signed in", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findMySpaceTab();

    const tabs = within(tabList()).getAllByRole("tab");

    expect(tabs).toEqual([tab("Descubrir"), tab("Mi espacio")]);
  });

  it("offers only the Descubrir tab when signed out", async () => {
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    const tabs = within(tabList()).getAllByRole("tab");

    expect(tabs).toEqual([tab("Descubrir")]);
  });

  it("offers Mi espacio once the user signs in", async () => {
    const hub = await createSeededHub();
    renderHubPage(hub);
    await cardTitled("Clima diario");

    await act(async () => {
      await hub.signIn({ kind: "email", email: ANA.handle });
    });

    expect(await findMySpaceTab()).toBeTruthy();
  });

  it("starts with Descubrir selected", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findMySpaceTab();

    expect([isSelected(tab("Descubrir")), isSelected(tab("Mi espacio"))]).toEqual([true, false]);
  });

  it("shows the Descubrir content in a tab panel labelled by its tab", async () => {
    renderHubPage(await createSeededHub());

    const panel = screen.getByRole("tabpanel", { name: "Descubrir" });

    expect(await within(panel).findByRole("link", { name: "Clima diario" })).toBeTruthy();
  });

  it("selects Mi espacio when its tab is clicked", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await openMySpace();

    expect([isSelected(tab("Descubrir")), isSelected(tab("Mi espacio"))]).toEqual([false, true]);
  });

  it("shows the Mi espacio content in a tab panel labelled by its tab", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await openMySpace();

    const panel = screen.getByRole("tabpanel", { name: "Mi espacio" });
    expect(
      within(panel).getByRole("heading", { level: 2, name: "Mis publicaciones" }),
    ).toBeTruthy();
  });

  it("has no Explorar options nor a filters sidebar", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findMySpaceTab();

    expect({
      explore: screen.queryByRole("radiogroup", { name: "Explorar" }),
      sidebar: screen.queryByRole("complementary", { name: "Filtros del hub" }),
    }).toEqual({ explore: null, sidebar: null });
  });

  it("stops offering Mi espacio once the user signs out", async () => {
    const hub = await signedInAs(await createSeededHub(), ANA.handle);
    renderHubPage(hub);
    await findMySpaceTab();

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect(within(tabList()).queryByRole("tab", { name: "Mi espacio" })).toBeNull();
    });
  });

  it("goes back to Descubrir when the user signs out from Mi espacio", async () => {
    const hub = await signedInAs(await createSeededHub(), ANA.handle);
    renderHubPage(hub);
    await openMySpace();
    await cardTitled("Ventas por región");

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect({
        isDiscoverSelected: isSelected(tab("Descubrir")),
        discoverPanel: screen.queryByRole("tabpanel", { name: "Descubrir" }) !== null,
      }).toEqual({ isDiscoverSelected: true, discoverPanel: true });
    });
  });
});

describe("HubPage Descubrir filters", () => {
  it("keeps the Tipo options in the Filtros del hub region", async () => {
    renderHubPage(await createSeededHub());

    expect(within(filtersRegion()).getByRole("radiogroup", { name: "Tipo" })).toBeTruthy();
  });

  it("keeps the Etiquetas in the Filtros del hub region", async () => {
    renderHubPage(await createTaggedHub());

    await cardTitled("Clima diario");

    expect(within(filtersRegion()).getByRole("group", { name: "Etiquetas" })).toBeTruthy();
  });
});

describe("HubPage Descubrir when signed out", () => {
  it("shows the hero heading", async () => {
    renderHubPage(await createSeededHub());

    expect(await screen.findByRole("heading", { level: 2, name: HERO_HEADING })).toBeTruthy();
  });

  it("offers to start from a topic or from programming", async () => {
    renderHubPage(await createSeededHub());

    expect({
      topic: screen.queryByRole("button", { name: "Sé de un tema" }) !== null,
      code: screen.queryByRole("button", { name: "Sé programar" }) !== null,
    }).toEqual({ topic: true, code: true });
  });

  it("chooses Flujos from Sé de un tema", async () => {
    renderHubPage(await createSeededHub());

    await userEvent.click(screen.getByRole("button", { name: "Sé de un tema" }));

    expect(["Todo", "Flujos", "Nodos"].map((name) => isChecked(kindChip(name)))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("chooses Nodos from Sé programar", async () => {
    renderHubPage(await createSeededHub());

    await userEvent.click(screen.getByRole("button", { name: "Sé programar" }));

    expect(["Todo", "Flujos", "Nodos"].map((name) => isChecked(kindChip(name)))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("lists only flow publications after Sé de un tema", async () => {
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    await userEvent.click(screen.getByRole("button", { name: "Sé de un tema" }));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario", "Ventas por región"]);
    });
  });

  it("does not show a Para ti section", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect(screen.queryByRole("heading", { name: "Para ti" })).toBeNull();
  });
});

describe("HubPage Descubrir when signed in", () => {
  it("shows a Para ti section", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    expect(await screen.findByRole("heading", { level: 2, name: "Para ti" })).toBeTruthy();
  });

  it("does not show the hero", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await findMySpaceTab();

    expect({
      heading: screen.queryByRole("heading", { name: HERO_HEADING }),
      topic: screen.queryByRole("button", { name: "Sé de un tema" }),
      code: screen.queryByRole("button", { name: "Sé programar" }),
    }).toEqual({ heading: null, topic: null, code: null });
  });
});

describe("HubPage Descubrir publications", () => {
  it("lists every publication under Recién publicado", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect({
      heading: sectionHeading("Recién publicado") !== null,
      cards: cardTitles(),
    }).toEqual({ heading: true, cards: TITLES });
  });

  it("no longer heads the list Recientes", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect(sectionHeading("Recientes")).toBeNull();
  });

  it("heads the list Resultados when there is search text", async () => {
    renderHubPage(await createSeededHub(), "clima");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario"]);
    });

    expect({
      results: sectionHeading("Resultados") !== null,
      recent: sectionHeading("Recién publicado") !== null,
    }).toEqual({ results: true, recent: false });
  });
});

describe("HubPage Mi espacio", () => {
  it("shows Mis flujos and Mis publicaciones together", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await openMySpace();

    expect({
      flows: sectionHeading("Mis flujos") !== null,
      publications: sectionHeading("Mis publicaciones") !== null,
    }).toEqual({ flows: true, publications: true });
  });

  it("hides the Descubrir content", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await openMySpace();

    expect({
      forYou: screen.queryByRole("heading", { name: "Para ti" }),
      recent: sectionHeading("Recién publicado"),
    }).toEqual({ forYou: null, recent: null });
  });

  it("shows only the signed-in user's publications", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await openMySpace();

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto", "Ventas por región"]);
    });
  });

  it("keeps only the user's publications whose title matches the text", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle), "ventas");

    await openMySpace();

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("keeps only the user's publications whose description matches the text", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle), "acentos");

    await openMySpace();

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("keeps only the user's publications with a tag that matches the text", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), ANA.handle), "comercial");

    await openMySpace();

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("matches the user's publications regardless of accents in the text", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), ANA.handle), "region");

    await openMySpace();

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("says nothing matches when none of the user's publications matches the text", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle), "zzzz");

    await openMySpace();

    expect(await screen.findByText("No hay publicaciones que coincidan")).toBeTruthy();
  });
});

describe("HubPage Etiquetas filter", () => {
  it("offers one toggle per distinct tag of the listed publications, sorted", async () => {
    renderHubPage(await createTaggedHub());

    await cardTitled("Clima diario");

    expect(tagNames()).toEqual(["clima", "comercial", "mensual", "texto"]);
  });

  it("starts with no tag pressed", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");

    const pressed = within(tagGroup())
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-pressed"));

    expect(pressed).toEqual(["false", "false", "false", "false"]);
  });

  it("marks a tag pressed when clicked", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");

    await userEvent.click(tagButton("mensual"));

    expect(tagButton("mensual").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps only the publications with the pressed tag", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");

    await userEvent.click(tagButton("mensual"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario", "Ventas por región"]);
    });
  });

  it("keeps only the publications that have every pressed tag", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");

    await userEvent.click(tagButton("mensual"));
    await userEvent.click(tagButton("comercial"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("removes a tag's filter when it is pressed again", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("mensual"));
    await userEvent.click(tagButton("comercial"));

    await userEvent.click(tagButton("comercial"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario", "Ventas por región"]);
    });
    expect(tagButton("comercial").getAttribute("aria-pressed")).toBe("false");
  });

  it("offers only the tags of the publications of the chosen kind", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");

    await userEvent.click(kindChip("Nodos"));

    await waitFor(() => {
      expect(tagNames()).toEqual(["texto"]);
    });
  });

  it("keeps offering a pressed tag after the kind changes so that it can be unpressed", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("comercial"));

    await userEvent.click(kindChip("Nodos"));

    await waitFor(() => {
      expect(tagNames()).toEqual(["comercial", "texto"]);
    });
    expect(tagButton("comercial").getAttribute("aria-pressed")).toBe("true");
  });

  it("lifts a pressed tag's filter when it is pressed again after the kind changes", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("comercial"));
    await userEvent.click(kindChip("Nodos"));
    await waitFor(() => {
      expect(cardTitles()).toEqual([]);
    });

    await userEvent.click(tagButton("comercial"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("stops offering an unpressed tag that no listed publication has", async () => {
    renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("comercial"));
    await userEvent.click(kindChip("Nodos"));
    await waitFor(() => {
      expect(cardTitles()).toEqual([]);
    });

    await userEvent.click(tagButton("comercial"));

    await waitFor(() => {
      expect(tagNames()).toEqual(["texto"]);
    });
  });

  it("keeps offering a pressed tag after the text changes", async () => {
    const { showText } = renderHubPage(await createTaggedHub());
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("comercial"));

    showText("clima");

    await waitFor(() => {
      expect(tagNames()).toEqual(["clima", "comercial", "mensual"]);
    });
    expect(tagButton("comercial").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the Etiquetas group with the pressed tag when no listed publication has tags", async () => {
    renderHubPage(await createHubWithUntaggedNode());
    await cardTitled("Ventas por región");
    await userEvent.click(tagButton("comercial"));

    await userEvent.click(kindChip("Nodos"));
    await waitFor(() => {
      expect(cardTitles()).toEqual([]);
    });

    expect(tagNames()).toEqual(["comercial"]);
    expect(tagButton("comercial").getAttribute("aria-pressed")).toBe("true");
  });

  it("hides the Etiquetas group when no publication has tags", async () => {
    renderHubPage(await createUntaggedHub());

    await cardTitled("Ventas por región");

    expect(screen.queryByRole("group", { name: "Etiquetas" })).toBeNull();
  });
});
