import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { Route, RouteRequest } from "../src/http/route.ts";
import { createRouter } from "../src/http/router.ts";
import type { IdentityPort } from "../src/requests/identity.ts";

const USER = { userId: "u1", accessToken: "jwt-u1" };
const identity: IdentityPort = {
  resolve: (bearer) =>
    Promise.resolve(
      bearer === USER.accessToken
        ? ok(USER)
        : err({ code: "UNAUTHORIZED" as const, message: "Invalid token" }),
    ),
};

function recordingRoute(path: string, method: Route["method"] = "GET") {
  const seen: RouteRequest[] = [];
  const route: Route = {
    method,
    path,
    handle: (request) => {
      seen.push(request);
      return Promise.resolve({ status: 200, body: { ok: true } });
    },
  };
  return { route, seen };
}

const AUTH = "Bearer jwt-u1";
const get = (url: string, authorization: string | undefined) => ({
  method: "GET",
  url,
  authorization,
  rawBody: "",
});

describe("router", () => {
  it("matches path params", async () => {
    const { route, seen } = recordingRoute("/agent/components/:id/why");
    const router = createRouter({ identity, routes: [route] });

    const reply = await router.dispatch(get("/agent/components/node%201/why", AUTH));

    expect(reply).toEqual({ status: 200, body: { ok: true } });
    expect(seen[0]?.params).toEqual({ id: "node 1" });
    expect(seen[0]?.identity).toEqual(USER);
  });

  it("parses query string", async () => {
    const { route, seen } = recordingRoute("/agent/search");
    const router = createRouter({ identity, routes: [route] });

    await router.dispatch(get("/agent/search?q=fresa%20dulce&k=5", AUTH));

    expect(seen[0]?.query).toEqual({ q: "fresa dulce", k: "5" });
  });

  it("passes the raw body through", async () => {
    const { route, seen } = recordingRoute("/agent/proposals/:id/decision", "POST");
    const router = createRouter({ identity, routes: [route] });

    await router.dispatch({
      ...get("/agent/proposals/p1/decision", AUTH),
      method: "POST",
      rawBody: "{}",
    });

    expect(seen[0]?.rawBody).toBe("{}");
  });

  it.each([undefined, "Bearer other", "Basic x"])(
    "unauthorized without bearer: %s",
    async (header) => {
      const { route, seen } = recordingRoute("/agent/search");
      const router = createRouter({ identity, routes: [route] });

      const reply = await router.dispatch(get("/agent/search", header));

      expect(reply).toEqual({ status: 401, body: { error: "unauthorized" } });
      expect(seen).toHaveLength(0);
    },
  );

  it("an unavailable auth service is 502", async () => {
    const down: IdentityPort = {
      resolve: () => Promise.resolve(err({ code: "UNAVAILABLE" as const, message: "db down" })),
    };
    const router = createRouter({ identity: down, routes: [recordingRoute("/a").route] });

    expect(await router.dispatch(get("/a", AUTH))).toEqual({
      status: 502,
      body: { error: "upstream_unavailable" },
    });
  });

  it.each([
    ["other path", "GET", "/nope"],
    ["other method", "POST", "/agent/search"],
    ["extra segment", "GET", "/agent/search/extra"],
    ["fewer segments", "GET", "/agent"],
    ["malformed escape", "GET", "/agent/components/%E0%A4%A/why"],
  ])("returns undefined when no route matches: %s", async (_name, method, url) => {
    const routes = [
      recordingRoute("/agent/search").route,
      recordingRoute("/agent/components/:id/why").route,
    ];
    const router = createRouter({ identity, routes });

    expect(await router.dispatch({ ...get(url, AUTH), method })).toBeUndefined();
  });

  it("unmatched routes are not authenticated", async () => {
    const router = createRouter({ identity, routes: [] });

    expect(await router.dispatch(get("/nope", undefined))).toBeUndefined();
  });

  it("route errors become 500 without leaking details", async () => {
    const route: Route = {
      method: "GET",
      path: "/boom",
      handle: () => Promise.reject(new Error("secret-db-password")),
    };
    const router = createRouter({ identity, routes: [route] });

    const reply = await router.dispatch(get("/boom", AUTH));

    expect(reply).toEqual({ status: 500, body: { error: "internal_error" } });
  });
});
