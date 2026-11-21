import type { Hub } from "@nodomics/hub";
import { ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { ANA_CARD, MINIMAL_CARD, createFakeFeed } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function feedWithCard(card = ANA_CARD) {
  return createFakeFeed({ card: () => Promise.resolve(ok(card)) });
}

function page(handle: string, feed: FeedService): ReactNode {
  return (
    <FeedContext.Provider value={feed}>
      <ProfilePage handle={handle} />
    </FeedContext.Provider>
  );
}

async function signedInAs(handle: string): Promise<Hub> {
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: handle });
  return hub;
}

const cardSection = async () => {
  const heading = await screen.findByRole("heading", { name: "Perfil de colaboración" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The card heading is not inside a section");
  return section;
};

describe("ProfilePage collaboration card", () => {
  it("loads the card of the page handle", async () => {
    const { feed, card } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    await screen.findByText(ANA_CARD.about);

    expect(card).toHaveBeenCalledWith("ana");
  });

  it("shows the about text", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    expect(await screen.findByText("Veterinaria que estudia brotes en ganado.")).toBeTruthy();
  });

  it("shows each domain with its depth label", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    const section = await cardSection();
    await within(section).findByText(ANA_CARD.about);

    expect(
      ["epidemiología veterinaria", "estadística", "teoría de grafos", "Experto", "Práctica"].map(
        (text) => within(section).queryAllByText(new RegExp(text)).length > 0,
      ),
    ).toEqual([true, true, true, true, true]);
    expect(within(section).queryAllByText(/Curiosidad/).length).toBeGreaterThan(0);
  });

  it("shows the technical label", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    expect(await screen.findByText("Arma flujos")).toBeTruthy();
  });

  it("lists what the person offers and seeks", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    const offers = await screen.findByRole("list", { name: "Ofrece" });
    const seeks = screen.getByRole("list", { name: "Busca" });

    expect({
      offers: within(offers)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
      seeks: within(seeks)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    }).toEqual({ offers: ANA_CARD.offers, seeks: ANA_CARD.seeks });
  });

  it("shows the links as anchors", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    const section = await cardSection();
    await within(section).findByRole("link", { name: "LinkedIn" });

    expect(
      ["LinkedIn", "GitHub", "Sitio web"].map((name) =>
        within(section).getByRole("link", { name }).getAttribute("href"),
      ),
    ).toEqual(["https://linkedin.com/in/ana", "https://github.com/ana", "https://ana.example.com"]);
  });

  it("omits the links the card does not have", async () => {
    const { feed } = feedWithCard(MINIMAL_CARD);
    renderWithHub(page("ana", feed), await createSeededHub());

    await screen.findByText(MINIMAL_CARD.about);

    expect(screen.queryByRole("link", { name: "LinkedIn" })).toBeNull();
  });

  it("says there is no collaboration profile when the card is missing", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(page("ana", feed), await createSeededHub());

    expect(await screen.findByText("Todavía no hay perfil de colaboración.")).toBeTruthy();
  });
});

describe("ProfilePage edit button", () => {
  it("shows Editar perfil to the owner", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await signedInAs("ana"));

    expect(await screen.findByRole("button", { name: "Editar perfil" })).toBeTruthy();
  });

  it("hides Editar perfil from other signed-in users", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await signedInAs("beto"));

    await screen.findByText(ANA_CARD.about);

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
  });

  it("hides Editar perfil from visitors", async () => {
    const { feed } = feedWithCard();
    renderWithHub(page("ana", feed), await createSeededHub());

    await screen.findByText(ANA_CARD.about);

    expect(screen.queryByRole("button", { name: "Editar perfil" })).toBeNull();
  });
});
