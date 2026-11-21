import type { Hub } from "@nodomics/hub";
import { err } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AppStoresContext } from "../app-context.ts";
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
const exploreOption = (name: string) => radioIn("Explorar", name);
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
  const rendered = renderWithHub(<HubPage text={text} />, hub);
  const showText = (next: string) => {
    rendered.rerender(
      <AppStoresContext value={rendered.stores}>
        <HubContext value={hub}>
          <HubPage text={next} />
        </HubContext>
      </AppStoresContext>,
    );
  };
  return { ...rendered, showText };
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

/** Mis publicaciones is offered once the signed-in profile has loaded. */
async function chooseExplore(name: string) {
  await userEvent.click(await within(radioGroup("Explorar")).findByRole("radio", { name }));
}

const findExploreOption = (name: string) =>
  within(radioGroup("Explorar")).findByRole("radio", { name });

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

describe("HubPage Explorar filter", () => {
  it("offers Para ti, Recientes and Mis publicaciones when signed in", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findExploreOption("Mis publicaciones");

    const radios = within(radioGroup("Explorar")).getAllByRole("radio");

    expect(radios).toEqual([
      exploreOption("Para ti"),
      exploreOption("Recientes"),
      exploreOption("Mis publicaciones"),
    ]);
  });

  it("offers only Para ti and Recientes when signed out", async () => {
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    const radios = within(radioGroup("Explorar")).getAllByRole("radio");

    expect(radios).toEqual([exploreOption("Para ti"), exploreOption("Recientes")]);
  });

  it("offers Mis publicaciones once the user signs in", async () => {
    const hub = await createSeededHub();
    renderHubPage(hub);
    await cardTitled("Clima diario");

    await act(async () => {
      await hub.signIn({ kind: "email", email: ANA.handle });
    });

    expect(await findExploreOption("Mis publicaciones")).toBeTruthy();
  });

  it("starts with Para ti chosen", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findExploreOption("Mis publicaciones");

    expect(
      ["Para ti", "Recientes", "Mis publicaciones"].map((name) => isChecked(exploreOption(name))),
    ).toEqual([true, false, false]);
  });

  it("chooses the option the user clicks", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await findExploreOption("Mis publicaciones");

    await chooseExplore("Recientes");

    expect(
      ["Para ti", "Recientes", "Mis publicaciones"].map((name) => isChecked(exploreOption(name))),
    ).toEqual([false, true, false]);
  });
});

describe("HubPage Para ti view", () => {
  it("shows a Para ti section", async () => {
    renderHubPage(await createSeededHub());

    expect(screen.getByRole("heading", { name: "Para ti" })).toBeTruthy();
  });

  it("says the recommendations are a mockup", async () => {
    renderHubPage(await createSeededHub());

    expect(
      screen.getByText(/Maqueta: recomendaciones según los flujos en los que trabajas\./),
    ).toBeTruthy();
  });

  it("lists the publications under Recientes", async () => {
    renderHubPage(await createSeededHub());

    await cardTitled("Clima diario");

    expect(sectionHeading("Recientes")).toBeTruthy();
  });

  it("heads the list Resultados when there is search text", async () => {
    renderHubPage(await createSeededHub(), "clima");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Clima diario"]);
    });

    expect({
      results: sectionHeading("Resultados") !== null,
      recent: sectionHeading("Recientes") !== null,
    }).toEqual({ results: true, recent: false });
  });
});

describe("HubPage Recientes view", () => {
  it("hides the Para ti section", async () => {
    renderHubPage(await createSeededHub());

    await chooseExplore("Recientes");

    expect(screen.queryByRole("heading", { name: "Para ti" })).toBeNull();
  });

  it("lists every publication under Recientes", async () => {
    renderHubPage(await createSeededHub());
    await cardTitled("Clima diario");

    await chooseExplore("Recientes");

    expect({ heading: sectionHeading("Recientes") !== null, cards: cardTitles() }).toEqual({
      heading: true,
      cards: TITLES,
    });
  });

  it("heads the list Resultados when there is search text", async () => {
    renderHubPage(await createSeededHub(), "clima");

    await chooseExplore("Recientes");

    expect({
      results: sectionHeading("Resultados") !== null,
      recent: sectionHeading("Recientes") !== null,
    }).toEqual({ results: true, recent: false });
  });
});

describe("HubPage Mis publicaciones view", () => {
  it("shows only the signed-in user's publications", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await chooseExplore("Mis publicaciones");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto", "Ventas por región"]);
    });
  });

  it("heads the list Mis publicaciones", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));

    await chooseExplore("Mis publicaciones");

    expect(
      await screen.findByRole("heading", { level: 2, name: "Mis publicaciones" }),
    ).toBeTruthy();
  });

  it("keeps only the chosen kind among the user's publications", async () => {
    const user = userEvent.setup();
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle));
    await chooseExplore("Mis publicaciones");
    await cardTitled("Limpiar texto");

    await user.click(kindChip("Nodos"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("keeps only the user's publications whose title matches the text", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle), "ventas");

    await chooseExplore("Mis publicaciones");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("keeps only the user's publications whose description matches the text", async () => {
    renderHubPage(await signedInAs(await createSeededHub(), ANA.handle), "acentos");

    await chooseExplore("Mis publicaciones");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("keeps only the user's publications with the pressed tag", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), ANA.handle));
    await chooseExplore("Mis publicaciones");
    await cardTitled("Limpiar texto");

    await userEvent.click(tagButton("texto"));

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("keeps only the user's publications with a tag that matches the text", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), ANA.handle), "comercial");

    await chooseExplore("Mis publicaciones");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("matches the user's publications regardless of accents in the text", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), ANA.handle), "region");

    await chooseExplore("Mis publicaciones");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Ventas por región"]);
    });
  });

  it("stops offering Mis publicaciones once the user signs out", async () => {
    const hub = await signedInAs(await createSeededHub(), ANA.handle);
    renderHubPage(hub);
    await findExploreOption("Mis publicaciones");

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect(
        within(radioGroup("Explorar")).queryByRole("radio", { name: "Mis publicaciones" }),
      ).toBeNull();
    });
  });

  it("goes back to Para ti when the user signs out", async () => {
    const hub = await signedInAs(await createSeededHub(), ANA.handle);
    renderHubPage(hub);
    await chooseExplore("Mis publicaciones");
    await cardTitled("Ventas por región");

    await act(async () => {
      await hub.signOut();
    });

    await waitFor(() => {
      expect({
        isForYouChosen: isChecked(exploreOption("Para ti")),
        forYouSection: screen.queryByRole("heading", { name: "Para ti" }) !== null,
      }).toEqual({ isForYouChosen: true, forYouSection: true });
    });
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

  it("keeps offering a pressed tag after the Explorar view changes", async () => {
    renderHubPage(await signedInAs(await createTaggedHub(), "beto"));
    await cardTitled("Clima diario");
    await userEvent.click(tagButton("comercial"));

    await chooseExplore("Mis publicaciones");

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
