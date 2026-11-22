import type { FeedMapPerson } from "@nodomics/profile";
import { ok } from "@nodomics/protocol";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { createFakeFeed, profileHit } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import { HubPage } from "./HubPage.tsx";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";

const BETO: FeedMapPerson = {
  handle: "beto",
  title: "Beto Ruiz",
  technical: "codes",
  offers: ["Pipelines de datos"],
  vector: [1, 0],
  match: false,
};

async function renderHub(text: string) {
  const { feed } = createFakeFeed({
    search: () => Promise.resolve(ok([profileHit(BETO.handle, BETO.title)])),
  });
  const mapPeople = vi.fn<NonNullable<FeedService["mapPeople"]>>(() => Promise.resolve(ok([BETO])));
  renderWithHub(
    <FeedContext value={{ ...feed, mapPeople }}>
      <HubPage text={text} onSearch={vi.fn()} onOpenEditor={vi.fn()} onOpenCopy={vi.fn()} />
    </FeedContext>,
    await createSeededHub(),
  );
  return mapPeople;
}

describe("HubPage people map", () => {
  it("loads the unfiltered map when opened from the initial browse view", async () => {
    const mapPeople = await renderHub("");
    const openMap = screen.getByRole("button", { name: "Explorar personas en el mapa" });
    expect(mapPeople).not.toHaveBeenCalled();

    fireEvent.click(openMap);

    expect(await screen.findByRole("button", { name: BETO.title })).toBeDefined();
    expect(mapPeople).toHaveBeenCalledWith("");
  });

  it("opens the map from the people results using the active search", async () => {
    const mapPeople = await renderHub("clima");
    await screen.findByRole("list", { name: "Personas" });
    const openMap = screen.getByRole("button", { name: "Ver mapa" });

    fireEvent.click(openMap);

    expect(await screen.findByRole("button", { name: BETO.title })).toBeDefined();
    expect(mapPeople).toHaveBeenCalledWith("clima");
  });
});
