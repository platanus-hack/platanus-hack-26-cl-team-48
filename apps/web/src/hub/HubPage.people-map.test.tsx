import type { Hub } from "@nodomics/hub";
import type { FeedMapPerson } from "@nodomics/profile";
import type { Flow } from "@nodomics/protocol";
import { err, ok } from "@nodomics/protocol";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { ANA_CARD, createFakeFeed } from "../feed/feed-fixtures.ts";
import type { FeedResult, FeedService } from "../feed/feed-service.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { HubPage } from "./HubPage.tsx";
import { ANA, createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";

const BETO: FeedMapPerson = {
  handle: "beto",
  title: "Beto Ruiz",
  technical: "codes",
  offers: ["Pipelines de datos"],
  vector: [1, 0],
  match: false,
};

const MAP_OPTION = "Mapa de nichos";

type MapPeople = NonNullable<FeedService["mapPeople"]>;

async function signedInHub(): Promise<Hub> {
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: ANA.handle });
  return hub;
}

async function renderHub(text: string, feed: FeedService) {
  renderWithHub(
    <FeedContext value={feed}>
      <HubPage
        text={text}
        onSearch={vi.fn<(text: string) => void>()}
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext>,
    await signedInHub(),
  );
}

function feedWithoutMap(): FeedService {
  return createFakeFeed({ card: () => Promise.resolve(ok(ANA_CARD)) }).feed;
}

function feedWithMap(reply: FeedResult<FeedMapPerson[]> = ok([BETO])) {
  const mapPeople = vi.fn<MapPeople>(() => Promise.resolve(reply));
  return { feed: { ...feedWithoutMap(), mapPeople }, mapPeople };
}

async function exploreGroup() {
  const sidebar = await screen.findByRole("complementary", { name: "Filtros del hub" });
  return within(sidebar).getByRole("radiogroup", { name: "Explorar" });
}

async function chooseMap() {
  fireEvent.click(within(await exploreGroup()).getByRole("radio", { name: MAP_OPTION }));
}

describe("HubPage niche map", () => {
  it("offers the niche map in Explorar when the feed can map people", async () => {
    await renderHub("", feedWithMap().feed);

    const option = within(await exploreGroup()).queryByRole("radio", { name: MAP_OPTION });

    expect(option).not.toBeNull();
  });

  it("does not offer the niche map when the feed cannot map people", async () => {
    await renderHub("", feedWithoutMap());

    await screen.findByRole("heading", { level: 2, name: "Para ti" });

    expect(screen.queryByRole("radio", { name: MAP_OPTION })).toBeNull();
  });

  it("does not load the map until the option is chosen", async () => {
    const { feed, mapPeople } = feedWithMap();
    await renderHub("", feed);

    await exploreGroup();

    expect(mapPeople).not.toHaveBeenCalled();
  });

  it("loads the unfiltered map when chosen without search text", async () => {
    const { feed, mapPeople } = feedWithMap();
    await renderHub("", feed);

    await chooseMap();

    expect(await screen.findByRole("button", { name: BETO.title })).toBeDefined();
    expect(mapPeople).toHaveBeenCalledWith("");
  });

  it("loads the map with the current search text", async () => {
    const { feed, mapPeople } = feedWithMap();
    await renderHub("clima", feed);

    await chooseMap();

    expect(await screen.findByRole("button", { name: BETO.title })).toBeDefined();
    expect(mapPeople).toHaveBeenCalledWith("clima");
  });

  it("shows the niche of the loaded people", async () => {
    await renderHub("", feedWithMap().feed);

    await chooseMap();

    expect(await screen.findByRole("button", { name: /\b1 persona(?!s)/ })).toBeDefined();
  });

  it("asks to sign in when the map load is unauthenticated", async () => {
    await renderHub("", feedWithMap(err({ code: "UNAUTHENTICATED" })).feed);

    await chooseMap();

    expect(await screen.findByText("Inicia sesión para ver el mapa.")).toBeDefined();
  });

  it("explains when the map is unavailable", async () => {
    await renderHub("", feedWithMap(err({ code: "UNAVAILABLE" })).feed);

    await chooseMap();

    expect(await screen.findByText("El mapa de personas no está disponible.")).toBeDefined();
  });
});
