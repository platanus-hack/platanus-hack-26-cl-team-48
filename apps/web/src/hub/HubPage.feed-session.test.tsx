import type { Flow } from "@nodomics/protocol";
import { ok } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { createFakeFeed, profileHit } from "../feed/feed-fixtures.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

const HERO_HEADING = "Analiza datos como LEGO, junto a quien sabe lo que tú no";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

const forYou = async () => {
  const heading = await screen.findByRole("heading", { name: "Para ti" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The Para ti heading is not inside a section");
  return section;
};

async function openAsAna() {
  let viewer = "ana";
  const { feed, matches } = createFakeFeed({
    matches: () =>
      Promise.resolve(
        ok(
          viewer === "ana"
            ? [profileHit("carla", "Carla para Ana")]
            : [profileHit("carla", "Carla para Beto")],
        ),
      ),
  });
  const hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  renderWithHub(
    <FeedContext.Provider value={feed}>
      <HubPage
        text=""
        onSearch={vi.fn<(text: string) => void>()}
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext.Provider>,
    hub,
  );
  await within(await forYou()).findByText("Carla para Ana");
  return {
    hub,
    matches,
    setViewer: (next: string) => {
      viewer = next;
    },
  };
}

describe("HubPage Para ti when the session changes", () => {
  it("replaces Para ti with the hero after a sign-out", async () => {
    const { hub } = await openAsAna();

    await act(async () => {
      await hub.signOut();
    });

    expect(await screen.findByRole("heading", { level: 2, name: HERO_HEADING })).toBeTruthy();
    await waitFor(() => {
      expect({
        forYou: screen.queryByRole("heading", { name: "Para ti" }),
        match: screen.queryByText("Carla para Ana"),
      }).toEqual({ forYou: null, match: null });
    });
  });

  it("shows the new viewer's matches after switching user", async () => {
    const { hub, setViewer } = await openAsAna();

    await act(async () => {
      await hub.signOut();
    });
    setViewer("beto");
    await act(async () => {
      await hub.signIn({ kind: "email", email: "beto" });
    });

    const section = await forYou();
    expect(await within(section).findByText("Carla para Beto")).toBeTruthy();
    expect(within(section).queryByText("Carla para Ana")).toBeNull();
  });

  it("shows the new viewer's matches when sign-out and sign-in are batched", async () => {
    const { hub, matches, setViewer } = await openAsAna();
    const callsBefore = matches.mock.calls.length;

    setViewer("beto");
    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "beto" });
    });

    const section = await forYou();
    expect(await within(section).findByText("Carla para Beto")).toBeTruthy();
    expect(matches.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(within(section).queryByText("Carla para Ana")).toBeNull();
  });
});
