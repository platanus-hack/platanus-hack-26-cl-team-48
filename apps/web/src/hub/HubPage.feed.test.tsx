import type { Hub } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { err, ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoresContext } from "../app-context.ts";
import { FeedContext } from "../feed/feed-context.ts";
import { componentHit, createFakeFeed, profileHit } from "../feed/feed-fixtures.ts";
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

function withFeed(feed: FeedService, text = ""): ReactNode {
  return (
    <FeedContext.Provider value={feed}>
      <HubPage
        text={text}
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext.Provider>
  );
}

/** Renders the page with the feed and hands back a way to change the text the header would send. */
function renderWithFeed(feed: FeedService, hub: Hub) {
  const rendered = renderWithHub(withFeed(feed), hub);
  const showText = (next: string) => {
    rendered.rerender(
      <AppStoresContext value={rendered.stores}>
        <HubContext value={hub}>{withFeed(feed, next)}</HubContext>
      </AppStoresContext>,
    );
  };
  return { ...rendered, showText };
}

const forYou = async () => {
  const heading = await screen.findByRole("heading", { name: "Para ti" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The Para ti heading is not inside a section");
  return section;
};

describe("HubPage Para ti", () => {
  it("no longer shows the mockup note", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(withFeed(feed), await createSeededHub());

    await forYou();

    expect(screen.queryByText(/Maqueta/)).toBeNull();
  });

  it("invites signed-out visitors to sign in", async () => {
    const { feed } = createFakeFeed();
    renderWithHub(withFeed(feed), await createSeededHub());

    const section = await forYou();

    expect(
      await within(section).findByText("Entra para ver con quién puedes colaborar."),
    ).toBeTruthy();
  });

  it("asks to complete the profile when matches reports NO_PROFILE", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(err({ code: "NO_PROFILE" })),
    });
    renderWithHub(withFeed(feed), await signedInHub("ana"));

    const section = await forYou();

    expect(
      await within(section).findByText("Completa tu perfil para ver con quién puedes colaborar."),
    ).toBeTruthy();
    expect(
      within(section).getByRole("link", { name: "Completar perfil" }).getAttribute("href"),
    ).toBe("/u/ana");
  });

  it("shows one item per hit with its title", async () => {
    const { feed } = createFakeFeed({
      matches: () =>
        Promise.resolve(
          ok([
            profileHit("beto", "Beto Ruiz"),
            componentHit("node", "n1", "Limpiar texto"),
            componentHit("flow", "f1", "Clima diario"),
          ]),
        ),
    });
    renderWithHub(withFeed(feed), await signedInHub());

    const section = await forYou();
    await within(section).findByText("Beto Ruiz");

    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
  });

  it("links profile hits to the profile page", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
    });
    renderWithHub(withFeed(feed), await signedInHub());

    const section = await forYou();

    expect(
      (await within(section).findByRole("link", { name: "Beto Ruiz" })).getAttribute("href"),
    ).toBe("/u/beto");
  });

  it("labels node and flow hits with their kind", async () => {
    const { feed } = createFakeFeed({
      matches: () =>
        Promise.resolve(
          ok([componentHit("node", "n1", "Limpiar texto"), componentHit("flow", "f1", "Clima")]),
        ),
    });
    renderWithHub(withFeed(feed), await signedInHub());

    const section = await forYou();
    await within(section).findByText("Limpiar texto");

    expect({
      node: within(section).queryByText("Nodo") !== null,
      flow: within(section).queryByText("Flujo") !== null,
    }).toEqual({ node: true, flow: true });
  });

  it("shows an error notice when the recommendations are unavailable", async () => {
    const { feed } = createFakeFeed({
      matches: () => Promise.resolve(err({ code: "UNAVAILABLE" })),
    });
    renderWithHub(withFeed(feed), await signedInHub());

    expect(await screen.findByText("No pudimos cargar tus recomendaciones.")).toBeTruthy();
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
