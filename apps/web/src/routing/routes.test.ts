import { describe, expect, it } from "vitest";
import { pathOf, routeOf, type Route } from "./routes.ts";

describe("routeOf", () => {
  it.each<[string, Route]>([
    ["/", { page: "workspace" }],
    ["/hub", { page: "hub" }],
    ["/u/ana", { page: "profile", handle: "ana" }],
    ["/hub/ana/ventas-altas", { page: "publication", handle: "ana", slug: "ventas-altas" }],
  ])("reads %s", (path, route) => {
    expect(routeOf(path)).toEqual(route);
  });

  it.each<[string, Route]>([
    ["/hub/", { page: "hub" }],
    ["/u/ana/", { page: "profile", handle: "ana" }],
    ["/hub/ana/ventas/", { page: "publication", handle: "ana", slug: "ventas" }],
  ])("ignores the trailing slash of %s", (path, route) => {
    expect(routeOf(path)).toEqual(route);
  });

  it("decodes each segment", () => {
    const route = routeOf("/hub/an%C3%A1/a%2Fb");

    expect(route).toEqual({ page: "publication", handle: "aná", slug: "a/b" });
  });

  it.each([
    "",
    "/otra",
    "/u",
    "/u/",
    "/hub/ana",
    "/u/ana/extra",
    "/hub/ana/ventas/extra",
    "/x/y/z",
  ])("falls back to the workspace for %j", (path) => {
    expect(routeOf(path)).toEqual({ page: "workspace" });
  });
});

describe("pathOf", () => {
  it.each<[Route, string]>([
    [{ page: "workspace" }, "/"],
    [{ page: "hub" }, "/hub"],
    [{ page: "profile", handle: "ana" }, "/u/ana"],
    [{ page: "publication", handle: "ana", slug: "ventas-altas" }, "/hub/ana/ventas-altas"],
  ])("writes %j", (route, path) => {
    expect(pathOf(route)).toBe(path);
  });

  it("encodes each segment", () => {
    const path = pathOf({ page: "publication", handle: "ana", slug: "a/b" });

    expect(path).toBe("/hub/ana/a%2Fb");
  });

  it.each<Route>([
    { page: "workspace" },
    { page: "hub" },
    { page: "profile", handle: "aná lópez" },
    { page: "publication", handle: "a?b", slug: "c/d#e" },
  ])("is read back as the same route: %j", (route) => {
    expect(routeOf(pathOf(route))).toEqual(route);
  });
});
