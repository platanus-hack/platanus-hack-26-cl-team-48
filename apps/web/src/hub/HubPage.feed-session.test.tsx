import type { Flow } from "@nodomics/protocol";
import { ok } from "@nodomics/protocol";
import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedContext } from "../feed/feed-context.ts";
import { createFakeFeed, profileHit } from "../feed/feed-fixtures.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

const INVITATION = "Entra para ver con quién puedes colaborar.";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

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
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext.Provider>,
    hub,
  );
  const heading = await screen.findByRole("heading", { name: "Para ti" });
  const section = heading.closest("section");
  if (section === null) throw new Error("The Para ti heading is not inside a section");
  await within(section).findByText("Carla para Ana");
  return {
    hub,
    matches,
    section,
    setViewer: (next: string) => {
      viewer = next;
    },
  };
}

describe("HubPage Para ti when the session changes", () => {
  it("shows the signed-out invitation after a sign-out", async () => {
    const { hub, section } = await openAsAna();

    await act(async () => {
      await hub.signOut();
    });

    expect(await within(section).findByText(INVITATION)).toBeTruthy();
    expect(within(section).queryByText("Carla para Ana")).toBeNull();
  });

  it("shows the new viewer's matches after switching user", async () => {
    const { hub, section, setViewer } = await openAsAna();

    await act(async () => {
      await hub.signOut();
    });
    setViewer("beto");
    await act(async () => {
      await hub.signIn({ kind: "email", email: "beto" });
    });

    expect(await within(section).findByText("Carla para Beto")).toBeTruthy();
    expect(within(section).queryByText("Carla para Ana")).toBeNull();
  });

  it("shows the new viewer's matches when sign-out and sign-in are batched", async () => {
    const { hub, matches, section, setViewer } = await openAsAna();
    const callsBefore = matches.mock.calls.length;

    setViewer("beto");
    await act(async () => {
      await hub.signOut();
      await hub.signIn({ kind: "email", email: "beto" });
    });

    expect(await within(section).findByText("Carla para Beto")).toBeTruthy();
    expect(matches.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(within(section).queryByText("Carla para Ana")).toBeNull();
  });
});
