import type { AddressInfo } from "node:net";
import { FEED_PATHS } from "@nodomics/profile";
import { expect, it } from "vitest";
import type { AgentConfig } from "../src/config.ts";
import { buildFeedRoutes } from "../src/feed/feed-wiring.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "../src/http/route.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";
import { assembleServer, buildRequestDeps } from "../src/requests/wiring.ts";

const CONFIG: AgentConfig = {
  anthropicApiKey: "fixture-anthropic",
  voyageApiKey: "fixture-voyage",
  supabaseUrl: "https://supabase.example",
  supabaseAnonKey: "fixture-anon",
  mcpUrl: "fake",
  port: 8787,
  devIdentity: true,
  memory: "fake",
};

it("buildFeedRoutes returns all six feed routes", () => {
  const routes = buildFeedRoutes(CONFIG, { fetch: () => Promise.reject(new Error("offline")) });

  expect(routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual(
    [
      "POST /feed/profile",
      "GET /feed/cards/:handle",
      "GET /feed/search",
      "GET /feed/matches",
      "GET /feed/map",
      "POST /feed/registration",
    ].sort(),
  );
});

it("assembleServer serves the extra routes passed as third argument", async () => {
  const pingRoute: Route = {
    method: "GET",
    path: "/feed/ping",
    handle: () => Promise.resolve({ status: 200, body: { pong: true } }),
  };
  const deps = buildRequestDeps(CONFIG);
  const server = assembleServer(deps, createFakeMemory(), [pingRoute]);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${String(port)}/feed/ping`);

  await new Promise((resolve) => server.close(resolve));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ pong: true });
});

it.each(["/feed/search", "/feed/map"])(
  "%s rejects an empty access token without touching Supabase",
  async (path) => {
    const jwt = (role: string): string =>
      `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ role }))}.sig`;
    const factoryCalls: string[] = [];
    const fetchCalls: string[] = [];
    const routes = buildFeedRoutes(
      { ...CONFIG, supabaseAnonKey: jwt("anon") },
      {
        fetch: (input) => {
          fetchCalls.push(
            input instanceof URL ? input.href : typeof input === "string" ? input : input.url,
          );
          return Promise.reject(new Error("offline"));
        },
        clientFactory: (url) => {
          factoryCalls.push(url);
          return {} as unknown as SupabaseClient;
        },
      },
    );
    const route = routes.find((candidate) => candidate.path === path);

    const reply = await route?.handle({
      params: {},
      query: { q: "epidemiology" },
      identity: { userId: "u1", accessToken: "" },
      rawBody: "",
    });

    expect(reply).toEqual({ status: 401, body: { error: "unauthorized" } });
    expect(factoryCalls).toEqual([]);
    expect(fetchCalls).toEqual([]);
  },
);

const GUEST_ROUTES = [`POST ${FEED_PATHS.registration}`, `GET ${FEED_PATHS.search}`];

function describeRoute(route: Route): string {
  return `${route.method} ${route.path}`;
}

it("only the registration and search feed routes allow guests", () => {
  const routes = buildFeedRoutes(CONFIG, { fetch: () => Promise.reject(new Error("offline")) });

  const allowingGuests = routes.filter((route) => route.allowsGuest === true).map(describeRoute);

  expect(allowingGuests.sort()).toEqual([...GUEST_ROUTES].sort());
});

it("every other feed route does not allow guests", () => {
  const routes = buildFeedRoutes(CONFIG, { fetch: () => Promise.reject(new Error("offline")) });

  const closed = routes.filter((route) => !GUEST_ROUTES.includes(describeRoute(route)));

  expect(closed.length).toBeGreaterThan(0);
  expect(closed.every((route) => route.allowsGuest !== true)).toBe(true);
});
