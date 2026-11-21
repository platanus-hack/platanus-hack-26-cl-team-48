import { afterEach, describe, expect, it, vi } from "vitest";
import { MINIMAL_CARD } from "./feed-fixtures.ts";
import { createAppFeed } from "./create-app-feed.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAppFeed", () => {
  it.each([undefined, ""])("uses the memory service when the URL is %j", async (url) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const feed = createAppFeed(url === undefined ? {} : { VITE_AGENT_URL: url }, {
      getAccessToken: () => Promise.resolve("token"),
      currentHandle: () => Promise.resolve(undefined),
    });

    const matches = await feed.matches();
    const card = await feed.card("ana");

    expect({ matches, card, fetched: fetchSpy.mock.calls.length }).toEqual({
      matches: { ok: false, error: { code: "UNAUTHENTICATED" } },
      card: { ok: true, value: undefined },
      fetched: 0,
    });
  });

  it("uses the HTTP service against the URL when it is configured", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const feed = createAppFeed(
      { VITE_AGENT_URL: "https://agent.example.com" },
      {
        getAccessToken: () => Promise.resolve("token"),
        currentHandle: () => Promise.resolve(undefined),
      },
    );

    await feed.matches();

    const calls: unknown[][] = fetchSpy.mock.calls;
    expect(String(calls[0]?.[0])).toBe("https://agent.example.com/feed/matches");
  });

  it("follows the session handle in the memory service", async () => {
    const feed = createAppFeed(
      {},
      {
        getAccessToken: () => Promise.resolve(undefined),
        currentHandle: () => Promise.resolve("ana"),
      },
    );

    const saved = await feed.saveProfile(MINIMAL_CARD);
    const stored = await feed.card("ana");

    expect({ saved, stored }).toEqual({
      saved: { ok: true, value: MINIMAL_CARD },
      stored: { ok: true, value: MINIMAL_CARD },
    });
  });
});
