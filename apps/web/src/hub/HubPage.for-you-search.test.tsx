import type { Hub } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { ok } from "@nodomics/protocol";
import { screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoresContext } from "../app-context.ts";
import { FeedContext } from "../feed/feed-context.ts";
import { createFakeFeed, profileHit } from "../feed/feed-fixtures.ts";
import type { FeedService } from "../feed/feed-service.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { HubContext } from "./hub-context.ts";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

const FOR_YOU = { level: 2, name: "Para ti" } as const;

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function withFeed(feed: FeedService, text: string): ReactNode {
  return (
    <FeedContext.Provider value={feed}>
      <HubPage
        text={text}
        onSearch={vi.fn<(text: string) => void>()}
        onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
        onOpenCopy={vi.fn<(flow: Flow) => void>()}
      />
    </FeedContext.Provider>
  );
}

/** Signs in as Ana, renders the page with the given search text and hands back a way to change it. */
async function renderSignedIn(text: string) {
  const hub: Hub = await createSeededHub();
  await hub.signIn({ kind: "email", email: "ana" });
  const { feed } = createFakeFeed({
    matches: () => Promise.resolve(ok([profileHit("beto", "Beto Ruiz")])),
  });
  const rendered = renderWithHub(withFeed(feed, text), hub);
  const showText = (next: string) => {
    rendered.rerender(
      <AppStoresContext value={rendered.stores}>
        <HubContext value={hub}>{withFeed(feed, next)}</HubContext>
      </AppStoresContext>,
    );
  };
  return { showText };
}

describe("HubPage Para ti while searching", () => {
  it("hides Para ti when the search text is not empty", async () => {
    const { showText } = await renderSignedIn("");
    await screen.findByRole("heading", FOR_YOU);

    showText("ventas");

    await waitFor(() => {
      expect(screen.queryByRole("heading", FOR_YOU)).toBeNull();
    });
  });

  it("shows Para ti when the search text is only spaces", async () => {
    await renderSignedIn("   ");

    const heading = await screen.findByRole("heading", FOR_YOU);

    expect(heading).toBeTruthy();
  });

  it("shows Para ti again when the search text goes back to empty", async () => {
    const { showText } = await renderSignedIn("");
    await screen.findByRole("heading", FOR_YOU);
    showText("ventas");
    await waitFor(() => {
      expect(screen.queryByRole("heading", FOR_YOU)).toBeNull();
    });

    showText("");

    expect(await screen.findByRole("heading", FOR_YOU)).toBeTruthy();
  });
});
