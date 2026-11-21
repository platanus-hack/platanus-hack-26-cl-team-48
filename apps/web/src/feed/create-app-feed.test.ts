import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppFeed } from "./create-app-feed.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAppFeed", () => {
  it.each([undefined, ""])("uses the memory service when the URL is %j", async (url) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const feed = createAppFeed(url === undefined ? {} : { VITE_AGENT_URL: url }, () =>
      Promise.resolve("token"),
    );

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
    const feed = createAppFeed({ VITE_AGENT_URL: "https://agent.example.com" }, () =>
      Promise.resolve("token"),
    );

    await feed.matches();

    const calls: unknown[][] = fetchSpy.mock.calls;
    expect(String(calls[0]?.[0])).toBe("https://agent.example.com/feed/matches");
  });
});
