import { ok } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeededHub, renderWithHub } from "../hub/hub-pages-fixtures.tsx";
import { FeedContext } from "./feed-context.ts";
import { componentHit, createFakeFeed, profileHit } from "./feed-fixtures.ts";
import { ForYouSection } from "./ForYouSection.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

async function renderForYou() {
  const { feed } = createFakeFeed({
    matches: () =>
      Promise.resolve(
        ok([profileHit("beto", "Beto Ruiz"), componentHit("flow", "f1", "Clima diario")]),
      ),
  });
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  const onSearch = vi.fn<(text: string) => void>();
  renderWithHub(
    <FeedContext value={feed}>
      <ForYouSection onSearch={onSearch} />
    </FeedContext>,
    hub,
  );
  return { onSearch };
}

describe("ForYouSection", () => {
  it("hands a flow hit's title to onSearch from its search button", async () => {
    const { onSearch } = await renderForYou();
    const item = await screen.findByRole("article", { name: "Clima diario" });

    await userEvent.click(
      within(item).getByRole("button", { name: "Buscar «Clima diario» en el hub" }),
    );

    expect(onSearch.mock.calls).toEqual([["Clima diario"]]);
  });

  it("links a person hit to the profile page", async () => {
    await renderForYou();

    const person = await screen.findByRole("article", { name: "Beto Ruiz" });

    expect(within(person).getByRole("link", { name: "Beto Ruiz" }).getAttribute("href")).toBe(
      "/u/beto",
    );
  });
});
