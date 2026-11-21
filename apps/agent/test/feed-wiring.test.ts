import type { AddressInfo } from "node:net";
import { expect, it } from "vitest";
import type { AgentConfig } from "../src/config.ts";
import { buildFeedRoutes } from "../src/feed/feed-wiring.ts";
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

it("buildFeedRoutes returns exactly the five feed routes", () => {
  const routes = buildFeedRoutes(CONFIG, () => Promise.reject(new Error("offline")));

  expect(routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual(
    [
      "POST /feed/profile",
      "GET /feed/cards/:handle",
      "GET /feed/search",
      "GET /feed/matches",
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
