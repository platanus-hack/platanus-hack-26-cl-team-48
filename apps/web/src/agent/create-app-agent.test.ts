import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppAgent } from "./create-app-agent.ts";

const REQUEST = { goal: "Explica el flujo", flowId: "flow-1" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAppAgent", () => {
  it.each([undefined, ""])("uses the memory service when the URL is %j", async (url) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const agent = createAppAgent(url === undefined ? {} : { VITE_AGENT_URL: url }, {
      getAccessToken: () => Promise.resolve("token"),
    });

    const result = await agent.ask(REQUEST);

    expect({
      isOk: result.ok,
      hasProposal: result.ok && result.value.proposal !== undefined,
      fetched: fetchSpy.mock.calls.length,
    }).toEqual({ isOk: true, hasProposal: false, fetched: 0 });
  });

  it("uses the HTTP service against the URL when it is configured", async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ summary: "Hola", steps: 1 }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const agent = createAppAgent(
      { VITE_AGENT_URL: "https://agent.example.com" },
      { getAccessToken: () => Promise.resolve("token") },
    );

    await agent.ask(REQUEST);

    const calls: unknown[][] = fetchSpy.mock.calls;
    expect(String(calls[0]?.[0])).toBe("https://agent.example.com/agent/requests");
  });
});
