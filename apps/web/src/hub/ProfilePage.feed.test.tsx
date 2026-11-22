import type { Hub } from "@nodomics/hub";
import type { ProfileCard } from "@nodomics/profile";
import { err, ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { ANA_CARD, MINIMAL_CARD, createFakeFeed } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

const OWNER_INVITATION = "Cuéntanos qué haces y te conectamos con quien te complementa.";
const VISITOR_EMPTY = "@ana todavía no completó su perfil de colaboración.";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function feedWithCard(card: ProfileCard = ANA_CARD) {
  return createFakeFeed({ card: () => Promise.resolve(ok(card)) });
}

function page(feed: FeedService): ReactNode {
  return (
    <FeedContext.Provider value={feed}>
      <ProfilePage handle="ana" />
    </FeedContext.Provider>
  );
}

async function signedInAs(handle: string): Promise<Hub> {
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: handle });
  return hub;
}

async function showAnaCard(card: ProfileCard = ANA_CARD, hub?: Hub) {
  const { feed, ...spies } = feedWithCard(card);
  renderWithHub(page(feed), hub ?? (await createSeededHub()));
  await screen.findByText(card.about);
  return spies;
}

const containingAll = (...parts: ReadonlyArray<string>): unknown =>
  expect.stringMatching(new RegExp(parts.map((part) => `(?=.*${part})`).join("")));

const itemTexts = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("ProfilePage collaboration card", () => {
  it("loads the card of the page handle", async () => {
    const { card } = await showAnaCard();

    expect(card).toHaveBeenCalledWith("ana");
  });

  it("shows the display name as the main heading next to the card", async () => {
    await showAnaCard();

    expect(screen.getByRole("heading", { level: 1, name: "Ana Pérez" })).toBeTruthy();
  });

  it.each([
    ["uses", "Usa flujos"],
    ["builds", "Arma flujos"],
    ["codes", "Programa nodos"],
  ] as const)("shows the technical pill for %s", async (technical, label) => {
    await showAnaCard({ ...MINIMAL_CARD, technical });

    expect(screen.getByText(label)).toBeTruthy();
  });

  it("lists what the person can help with", async () => {
    await showAnaCard();

    expect(itemTexts("Puede ayudarte con")).toEqual(ANA_CARD.offers);
  });

  it("lists what the person is looking for", async () => {
    await showAnaCard();

    expect(itemTexts("Está buscando")).toEqual(ANA_CARD.seeks);
  });

  it("lists each domain with its level label", async () => {
    await showAnaCard();

    const items = itemTexts("Sabe de");

    expect(items).toEqual([
      containingAll("epidemiología veterinaria", "Experto/a"),
      containingAll("estadística", "Lo practica"),
      containingAll("teoría de grafos", "Le interesa"),
    ]);
  });

  it("does not render empty lists", async () => {
    await showAnaCard(MINIMAL_CARD);

    expect(
      ["Puede ayudarte con", "Está buscando", "Sabe de"].map(
        (name) => screen.queryByRole("list", { name }) !== null,
      ),
    ).toEqual([false, false, false]);
  });

  it("links to the card URLs", async () => {
    await showAnaCard();

    expect(
      ["LinkedIn", "GitHub", "Sitio web"].map((name) =>
        screen.getByRole("link", { name }).getAttribute("href"),
      ),
    ).toEqual(["https://linkedin.com/in/ana", "https://github.com/ana", "https://ana.example.com"]);
  });

  it("opens the card links in a new tab without opener access", async () => {
    await showAnaCard();

    const link = screen.getByRole("link", { name: "GitHub" });

    expect({
      target: link.getAttribute("target"),
      noopener: (link.getAttribute("rel") ?? "").split(" ").includes("noopener"),
    }).toEqual({ target: "_blank", noopener: true });
  });

  it("omits the links the card does not have", async () => {
    await showAnaCard(MINIMAL_CARD);

    expect(
      ["LinkedIn", "GitHub", "Sitio web"].map((name) => screen.queryByRole("link", { name })),
    ).toEqual([null, null, null]);
  });

  it("keeps listing the publications of the profile", async () => {
    await showAnaCard();

    expect(await screen.findByRole("link", { name: "Ventas por región" })).toBeTruthy();
  });

  it("says the card could not be loaded when the feed fails", async () => {
    const { feed } = createFakeFeed({
      card: () => Promise.resolve(err({ code: "UNAVAILABLE" })),
    });
    renderWithHub(page(feed), await createSeededHub());

    expect(await screen.findByText("No pudimos cargar el perfil de colaboración.")).toBeTruthy();
  });
});

describe("ProfilePage edit button", () => {
  it("shows Editar perfil to the owner", async () => {
    await showAnaCard(ANA_CARD, await signedInAs("ana"));

    expect(await screen.findByRole("button", { name: "Editar perfil" })).toBeTruthy();
  });

  it("hides Editar perfil from other signed-in users", async () => {
    await showAnaCard(ANA_CARD, await signedInAs("beto"));

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
  });

  it("hides Editar perfil from visitors", async () => {
    await showAnaCard();

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
  });
});

describe("ProfilePage without a card", () => {
  it("invites the owner to build the profile", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(page(feed), await signedInAs("ana"));

    expect(await screen.findByText(OWNER_INVITATION)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Armar mi perfil" })).toBeTruthy();
  });

  it("tells visitors the profile is not complete yet", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(page(feed), await createSeededHub());

    expect(await screen.findByText(VISITOR_EMPTY)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Armar mi perfil" })).toBeNull();
  });

  it("tells other signed-in users the profile is not complete yet", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(page(feed), await signedInAs("beto"));

    expect(await screen.findByText(VISITOR_EMPTY)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Armar mi perfil" })).toBeNull();
  });
});
