import type { AddressInfo } from "node:net";
import { ok } from "@nodomics/protocol";
import { afterEach, expect, it } from "vitest";
import type { Route } from "../src/http/route.ts";
import { createRouter } from "../src/http/router.ts";
import { createServer } from "../src/server.ts";

const USER = { userId: "u1", accessToken: "jwt" };
const whyRoute: Route = {
  method: "GET",
  path: "/agent/components/:id/why",
  handle: (request) =>
    Promise.resolve({ status: 200, body: { id: request.params["id"], q: request.query["q"] } }),
};
const echoRoute: Route = {
  method: "POST",
  path: "/echo",
  handle: (request) => Promise.resolve({ status: 200, body: { length: request.rawBody.length } }),
};

const servers: ReturnType<typeof createServer>[] = [];

async function start(): Promise<string> {
  const router = createRouter({
    identity: { resolve: () => Promise.resolve(ok(USER)) },
    routes: [whyRoute, echoRoute],
  });
  const server = createServer({ handleRequest: () => Promise.reject(new Error("unused")), router });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
  );
});

const AUTH = { Authorization: "Bearer jwt" };

it("GET /agent/components/:id/why reaches the route", async () => {
  const base = await start();

  const response = await fetch(`${base}/agent/components/n1/why?q=hola`, { headers: AUTH });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "n1", q: "hola" });
});

it("unknown route still 404", async () => {
  const base = await start();

  const response = await fetch(`${base}/unknown`, { headers: AUTH });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

it("the body limit applies to router routes", async () => {
  const base = await start();

  const response = await fetch(`${base}/echo`, {
    method: "POST",
    headers: AUTH,
    body: "x".repeat(20_000),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_body" });
});

it("small bodies reach router routes", async () => {
  const base = await start();

  const response = await fetch(`${base}/echo`, { method: "POST", headers: AUTH, body: "hello" });

  expect(await response.json()).toEqual({ length: 5 });
});
