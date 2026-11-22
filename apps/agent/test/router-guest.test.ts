import type { AddressInfo } from "node:net";
import { ok } from "@nodomics/protocol";
import { afterEach, expect, it } from "vitest";
import type { UserIdentity } from "../src/mcp/mcp-port.ts";
import type { Route } from "../src/http/route.ts";
import { createRouter } from "../src/http/router.ts";
import { createServer } from "../src/server.ts";

const GUEST: UserIdentity = { userId: "guest-1", accessToken: "anon-jwt", isGuest: true };
const MEMBER: UserIdentity = { userId: "u1", accessToken: "jwt" };
const AUTH = { Authorization: "Bearer jwt" };

type Recorded = { readonly route: Route; readonly calls: UserIdentity[] };

function recordingRoute(path: string, allowsGuest?: boolean): Recorded {
  const calls: UserIdentity[] = [];
  const route: Route = {
    method: "POST",
    path,
    ...(allowsGuest === undefined ? {} : { allowsGuest }),
    handle: (request) => {
      calls.push(request.identity);
      return Promise.resolve({ status: 200, body: { reached: path } });
    },
  };
  return { route, calls };
}

const servers: ReturnType<typeof createServer>[] = [];

async function start(identity: UserIdentity, routes: readonly Route[]): Promise<string> {
  const router = createRouter({
    identity: { resolve: () => Promise.resolve(ok(identity)) },
    routes: [...routes],
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

it("a guest is forbidden on a route that does not allow guests", async () => {
  const { route, calls } = recordingRoute("/private");
  const base = await start(GUEST, [route]);

  const response = await fetch(`${base}/private`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "guest_not_allowed" });
  expect(calls).toHaveLength(0);
});

it("a guest is forbidden on a route that sets allowsGuest to false", async () => {
  const { route, calls } = recordingRoute("/private", false);
  const base = await start(GUEST, [route]);

  const response = await fetch(`${base}/private`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "guest_not_allowed" });
  expect(calls).toHaveLength(0);
});

it("a guest reaches a route that allows guests", async () => {
  const { route, calls } = recordingRoute("/open", true);
  const base = await start(GUEST, [route]);

  const response = await fetch(`${base}/open`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ reached: "/open" });
  expect(calls).toEqual([GUEST]);
});

it("a guest is only forbidden on the routes that do not allow guests", async () => {
  const open = recordingRoute("/open", true);
  const closed = recordingRoute("/private");
  const base = await start(GUEST, [open.route, closed.route]);

  const openResponse = await fetch(`${base}/open`, { method: "POST", headers: AUTH, body: "{}" });
  const closedResponse = await fetch(`${base}/private`, {
    method: "POST",
    headers: AUTH,
    body: "{}",
  });

  expect(openResponse.status).toBe(200);
  expect(closedResponse.status).toBe(403);
});

it("a member reaches a route that does not allow guests", async () => {
  const { route, calls } = recordingRoute("/private");
  const base = await start(MEMBER, [route]);

  const response = await fetch(`${base}/private`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(200);
  expect(calls).toEqual([MEMBER]);
});

it("a member reaches a route that allows guests", async () => {
  const { route, calls } = recordingRoute("/open", true);
  const base = await start(MEMBER, [route]);

  const response = await fetch(`${base}/open`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(200);
  expect(calls).toEqual([MEMBER]);
});

it("an identity explicitly marked as not a guest reaches a closed route", async () => {
  const { route, calls } = recordingRoute("/private");
  const base = await start({ ...MEMBER, isGuest: false }, [route]);

  const response = await fetch(`${base}/private`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(200);
  expect(calls).toHaveLength(1);
});

it("an unknown route is still not found for a guest", async () => {
  const base = await start(GUEST, []);

  const response = await fetch(`${base}/unknown`, { method: "POST", headers: AUTH, body: "{}" });

  expect(response.status).toBe(404);
});
