import type { Hub } from "@nodomics/hub";
import type { FeedHit, ProfileCard } from "@nodomics/profile";
import type { Flow } from "@nodomics/protocol";
import { err, ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoresContext } from "../app-context.ts";
import { FeedContext } from "../feed/feed-context.ts";
import {
  ANA_CARD,
  BETO_CARD,
  MINIMAL_CARD,
  componentHit,
  componentHitWithSummary,
  createFakeFeed,
  profileHit,
} from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { HubContext } from "./hub-context.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function signedInHub(handle = "ana"): Promise<Hub> {
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: handle });
  return hub;
}

function withFeed(
  feed: FeedService,
  text = "",
  onSearch = vi.fn<(text: string) => void>(),
): ReactNode {
  return (
    <FeedContext.Provider value={feed}>
      <HubPage
        text={text}
        onSearch={onSearch}
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext.Provider>
  );
}

/** Renders the page with the feed and hands back a way to change the text the header would send. */
function renderWithFeed(feed: FeedService, hub: Hub) {
  const onSearch = vi.fn<(text: string) => void>();
  const rendered = renderWithHub(withFeed(feed, "", onSearch), hub);
  const showText = (next: string) => {
    rendered.rerender(
      <AppStoresContext value={rendered.stores}>
        <HubContext value={hub}>{withFeed(feed, next, onSearch)}</HubContext>
      </AppStoresContext>,
    );
  };
  return { ...rendered, onSearch, showText };
}

/** Signs in as Ana and renders the page with a feed whose matches are the given hits. */
async function renderWithMatches(hits: FeedHit[]) {
  const { feed } = createFakeFeed({ matches: () => Promise.resolve(ok(hits)) });
  return renderWithFeed(feed, await signedInHub());
}

const forYou = async () => {
  const heading = await screen.findByRole("heading", { level: 2, name: "Para ti" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The Para ti heading is not inside a section");
  return section;
};

const groupUnder = async (name: string) => {
  const heading = await within(await forYou()).findByRole("heading", { level: 3, name });
  const group = heading.closest("section") ?? heading.parentElement;
  if (group === null) throw new Error(`The ${name} heading has no container`);
  return group;
};

const PEOPLE_GROUP = "Personas que te complementan";
const COMPONENTS_GROUP = "Flujos y nodos para ti";

const FOUR_DOMAINS_CARD: ProfileCard = {
  ...ANA_CARD,
  domains: [
    { name: "epidemiología veterinaria", depth: "expert" },
    { name: "estadística", depth: "practitioner" },
    { name: "teoría de grafos", depth: "curious" },
    { name: "ganadería", depth: "curious" },
  ],
  offers: ["modelos de contagio", "análisis de datos", "talleres"],
  seeks: ["alguien que automatice mis análisis", "datos de campo", "financiamiento"],
};

describe("HubPage Para ti", () => {
  it("does not show Para ti to signed-out visitors", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(withFeed(feed), await createSeededHub());

    await screen.findByRole("link", { name: "Clima diario" });

    expect({
      heading: screen.queryByRole("heading", { name: "Para ti" }),
      invitation: screen.queryByText("Entra para ver con quién puedes colaborar."),
    }).toEqual({ heading: null, invitation: null });
  });

  it("no longer shows the mockup note", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(withFeed(feed), await signedInHub());

    await forYou();

    expect(screen.queryByText(/Maqueta/)).toBeNull();
  });

  it("says it is loading while the recommendations arrive", async () => {
    const { feed } = createFakeFeed({ matches: () => new Promise(() => undefined) });
    renderWithHub(withFeed(feed), await signedInHub());

    const section = await forYou();

    expect(await within(section).findByText("Cargando…")).toBeTruthy();
  });

  it("says there are no recommendations yet when matches is empty", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(withFeed(feed), await signedInHub());

    const section = await forYou();

    expect(
      await within(section).findByText("Todavía no hay recomendaciones para ti."),
    ).toBeTruthy();
  });

  it("invites to build the profile when matches reports NO_PROFILE", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(err({ code: "NO_PROFILE" })),
    });
    renderWithHub(withFeed(feed), await signedInHub("ana"));

    const section = await forYou();

    expect(
      await within(section).findByText(
        "Cuéntanos qué haces y te conectamos con quien te complementa.",
      ),
    ).toBeTruthy();
  });

  it("links the NO_PROFILE invitation to the own profile", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(err({ code: "NO_PROFILE" })),
    });
    renderWithHub(withFeed(feed), await signedInHub("beto"));

    const section = await forYou();

    expect(
      (await within(section).findByRole("link", { name: "Armar mi perfil" })).getAttribute("href"),
    ).toBe("/u/beto");
  });

  it("shows an error notice when the recommendations are unavailable", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(err({ code: "UNAVAILABLE" })),
    });
    renderWithHub(withFeed(feed), await signedInHub());

    expect(await screen.findByText("No pudimos cargar tus recomendaciones.")).toBeTruthy();
  });

  it("shows one article per hit named by its title", async () => {
    await renderWithMatches([
      profileHit("beto", "Beto Ruiz"),
      componentHit("node", "n1", "Limpiar texto"),
      componentHit("flow", "f1", "Clima diario"),
    ]);

    const section = await forYou();
    await within(section).findByRole("article", { name: "Beto Ruiz" });

    expect(
      ["Beto Ruiz", "Limpiar texto", "Clima diario"].map(
        (name) => within(section).queryByRole("article", { name }) !== null,
      ),
    ).toEqual([true, true, true]);
  });
});

describe("HubPage Para ti people", () => {
  it("groups profile hits under Personas que te complementan", async () => {
    await renderWithMatches([profileHit("beto", "Beto Ruiz")]);

    const group = await groupUnder(PEOPLE_GROUP);

    expect(within(group).getByRole("article", { name: "Beto Ruiz" })).toBeTruthy();
  });

  it("does not group profile hits with the flows and nodes", async () => {
    await renderWithMatches([
      profileHit("beto", "Beto Ruiz"),
      componentHit("node", "n1", "Limpiar texto"),
    ]);

    const group = await groupUnder(COMPONENTS_GROUP);

    expect(within(group).queryByRole("article", { name: "Beto Ruiz" })).toBeNull();
  });

  it("links the person's name to the profile page", async () => {
    await renderWithMatches([profileHit("beto", "Beto Ruiz")]);

    const person = await within(await forYou()).findByRole("article", { name: "Beto Ruiz" });

    expect(within(person).getByRole("link", { name: "Beto Ruiz" }).getAttribute("href")).toBe(
      "/u/beto",
    );
  });

  it("shows the technical level of a person who codes", async () => {
    await renderWithMatches([profileHit("beto", "Beto Ruiz", BETO_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Beto Ruiz" });

    expect(within(person).queryByText("Programa nodos")).not.toBeNull();
  });

  it("shows the technical level of a person who builds flows", async () => {
    await renderWithMatches([profileHit("ana", "Ana Pérez", ANA_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Ana Pérez" });

    expect(within(person).queryByText("Arma flujos")).not.toBeNull();
  });

  it("shows at most three of the person's domains", async () => {
    await renderWithMatches([profileHit("ana", "Ana Pérez", FOUR_DOMAINS_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Ana Pérez" });

    expect(
      ["epidemiología veterinaria", "estadística", "teoría de grafos", "ganadería"].map((domain) =>
        person.textContent.includes(domain),
      ),
    ).toEqual([true, true, true, false]);
  });

  it("says what the person can help with, from the first two offers", async () => {
    await renderWithMatches([profileHit("ana", "Ana Pérez", FOUR_DOMAINS_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Ana Pérez" });

    expect(
      within(person).queryByText("Puede ayudarte con: modelos de contagio, análisis de datos"),
    ).not.toBeNull();
  });

  it("says what the person is looking for, from the first two seeks", async () => {
    await renderWithMatches([profileHit("ana", "Ana Pérez", FOUR_DOMAINS_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Ana Pérez" });

    expect(
      within(person).queryByText(
        "Está buscando: alguien que automatice mis análisis, datos de campo",
      ),
    ).not.toBeNull();
  });

  it("leaves out the offers and seeks lines when the person has none", async () => {
    await renderWithMatches([profileHit("carla", "Carla Gómez", MINIMAL_CARD)]);

    const person = await within(await forYou()).findByRole("article", { name: "Carla Gómez" });

    expect({
      offers: person.textContent.includes("Puede ayudarte con"),
      seeks: person.textContent.includes("Está buscando"),
    }).toEqual({ offers: false, seeks: false });
  });

  it("shows only the name link when the profile payload cannot be read", async () => {
    await renderWithMatches([
      { kind: "profile", id: "beto", title: "Beto Ruiz", payload: { nope: 1 }, similarity: 0.9 },
    ]);

    const person = await within(await forYou()).findByRole("article", { name: "Beto Ruiz" });

    expect({
      href: within(person).getByRole("link", { name: "Beto Ruiz" }).getAttribute("href"),
      technical: ["Usa flujos", "Arma flujos", "Programa nodos"].some((level) =>
        person.textContent.includes(level),
      ),
      offers: person.textContent.includes("Puede ayudarte con"),
    }).toEqual({ href: "/u/beto", technical: false, offers: false });
  });
});

describe("HubPage Para ti flows and nodes", () => {
  it("groups node and flow hits under Flujos y nodos para ti", async () => {
    await renderWithMatches([
      componentHit("node", "n1", "Limpiar texto"),
      componentHit("flow", "f1", "Clima diario"),
    ]);

    const group = await groupUnder(COMPONENTS_GROUP);

    expect({
      node: within(group).queryByRole("article", { name: "Limpiar texto" }) !== null,
      flow: within(group).queryByRole("article", { name: "Clima diario" }) !== null,
    }).toEqual({ node: true, flow: true });
  });

  it("labels node and flow hits with their kind", async () => {
    await renderWithMatches([
      componentHit("node", "n1", "Limpiar texto"),
      componentHit("flow", "f1", "Clima"),
    ]);

    const section = await forYou();
    const node = await within(section).findByRole("article", { name: "Limpiar texto" });

    expect({
      node: within(node).queryByText("Nodo") !== null,
      flow:
        within(within(section).getByRole("article", { name: "Clima" })).queryByText("Flujo") !==
        null,
    }).toEqual({ node: true, flow: true });
  });

  it("shows the summary of a hit whose payload has one", async () => {
    await renderWithMatches([
      componentHitWithSummary("node", "Limpiar texto", "Quita espacios y acentos"),
    ]);

    const item = await within(await forYou()).findByRole("article", { name: "Limpiar texto" });

    expect(within(item).queryByText("Quita espacios y acentos")).not.toBeNull();
  });

  it("shows no summary when the payload's summary is not text", async () => {
    await renderWithMatches([componentHitWithSummary("node", "Limpiar texto", 42)]);

    const item = await within(await forYou()).findByRole("article", { name: "Limpiar texto" });

    expect(item.textContent).not.toContain("42");
  });

  it("offers to search the hit's title in the hub", async () => {
    await renderWithMatches([componentHit("flow", "f1", "Clima diario")]);

    const item = await within(await forYou()).findByRole("article", { name: "Clima diario" });

    expect(
      within(item).getByRole("button", { name: "Buscar «Clima diario» en el hub" }),
    ).toBeTruthy();
  });

  it("hands the hit's title to onSearch when its search button is clicked", async () => {
    const { onSearch } = await renderWithMatches([componentHit("node", "n1", "Limpiar texto")]);
    const item = await within(await forYou()).findByRole("article", { name: "Limpiar texto" });

    await userEvent.click(
      within(item).getByRole("button", { name: "Buscar «Limpiar texto» en el hub" }),
    );

    expect(onSearch.mock.calls).toEqual([["Limpiar texto"]]);
  });
});

describe("HubPage people search", () => {
  it("lists the profile hits of the search as links to their profiles", async () => {
    const { feed, search } = createFakeFeed({
      search: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
    });
    const { showText } = renderWithFeed(feed, await createSeededHub());

    showText("clima");

    const people = await screen.findByRole("list", { name: "Personas" });
    expect({
      href: within(people).getByRole("link", { name: "Beto Ruiz" }).getAttribute("href"),
      queried: search.mock.calls.some(([text]) => text === "clima"),
    }).toEqual({ href: "/u/beto", queried: true });
  });

  it("heads the people results Personas", async () => {
    const { feed } = createFakeFeed({
      search: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
    });
    const { showText } = renderWithFeed(feed, await createSeededHub());

    showText("clima");

    expect(await screen.findByRole("heading", { level: 2, name: "Personas" })).toBeTruthy();
  });

  it("keeps the publication results while showing people", async () => {
    const { feed } = createFakeFeed({
      search: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
    });
    const { showText } = renderWithFeed(feed, await createSeededHub());

    showText("clima");

    await screen.findByRole("list", { name: "Personas" });
    expect(await screen.findByRole("link", { name: "Clima diario" })).toBeTruthy();
  });

  it("shows no Personas list with an empty search", async () => {
    const { feed } = createFakeFeed({
      search: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
    });
    renderWithHub(withFeed(feed), await createSeededHub());

    await screen.findByRole("link", { name: "Clima diario" });

    expect(screen.queryByRole("list", { name: "Personas" })).toBeNull();
  });
});
