import { describe, expect, it } from "vitest";
import { flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { encodeSharedFlow } from "../flow/flow-file.ts";
import {
  editorOpeningOf,
  editorUrl,
  pathOf,
  routeOf,
  routeOfLocation,
  type EditorOpening,
  type Route,
} from "./routes.ts";

const SHARED_HASH = encodeSharedFlow(flowOf([nodeOf("s", SAMPLE.id)]));

const searchOf = (url: string) => new URL(url, "https://nodomics.test").search;
const pathnameOf = (url: string) => new URL(url, "https://nodomics.test").pathname;

describe("routeOf", () => {
  it.each<[string, Route]>([
    ["/", { page: "hub" }],
    ["/hub", { page: "hub" }],
    ["/editor", { page: "workspace" }],
    ["/u/ana", { page: "profile", handle: "ana" }],
    ["/hub/ana/ventas-altas", { page: "publication", handle: "ana", slug: "ventas-altas" }],
  ])("reads %s", (path, route) => {
    expect(routeOf(path)).toEqual(route);
  });

  it.each<[string, Route]>([
    ["/hub/", { page: "hub" }],
    ["/editor/", { page: "workspace" }],
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
    "/editor/extra",
    "/x/y/z",
  ])("falls back to the hub for %j", (path) => {
    expect(routeOf(path)).toEqual({ page: "hub" });
  });
});

describe("pathOf", () => {
  it.each<[Route, string]>([
    [{ page: "workspace" }, "/editor"],
    [{ page: "hub" }, "/"],
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

describe("routeOfLocation", () => {
  it("opens the hub at the root without a hash", () => {
    const route = routeOfLocation({ pathname: "/", hash: "" });

    expect(route).toEqual({ page: "hub" });
  });

  it("opens the editor at the root with a shared flow, so old shared links keep working", () => {
    const route = routeOfLocation({ pathname: "/", hash: SHARED_HASH });

    expect(route).toEqual({ page: "workspace" });
  });

  it("opens the hub at the root with a hash that is not a shared flow", () => {
    const route = routeOfLocation({ pathname: "/", hash: "#otra-cosa" });

    expect(route).toEqual({ page: "hub" });
  });

  it("opens the editor at /editor with a shared flow", () => {
    const route = routeOfLocation({ pathname: "/editor", hash: SHARED_HASH });

    expect(route).toEqual({ page: "workspace" });
  });

  it.each<[string, Route]>([
    ["/hub", { page: "hub" }],
    ["/editor", { page: "workspace" }],
    ["/u/ana", { page: "profile", handle: "ana" }],
    ["/hub/ana/ventas", { page: "publication", handle: "ana", slug: "ventas" }],
    ["/otra", { page: "hub" }],
  ])("reads %s like routeOf when there is no hash", (pathname, route) => {
    expect(routeOfLocation({ pathname, hash: "" })).toEqual(route);
  });

  it("keeps a hub page on the hub even with a shared flow hash", () => {
    const route = routeOfLocation({ pathname: "/hub", hash: SHARED_HASH });

    expect(route).toEqual({ page: "hub" });
  });
});

describe("editorUrl", () => {
  it("opens the editor on the latest flow at /editor", () => {
    const url = editorUrl({ kind: "latest" });

    expect(url).toBe("/editor");
  });

  it("opens a saved flow with its id in the query", () => {
    const url = editorUrl({ kind: "flow", id: "flow_1" });

    expect(url).toBe("/editor?flow=flow_1");
  });

  it("opens an empty canvas with ?new", () => {
    const url = editorUrl({ kind: "new" });

    expect(url).toBe("/editor?new");
  });

  it("encodes a flow id with reserved characters", () => {
    const url = editorUrl({ kind: "flow", id: "a b/c?d&e#f" });

    expect({ pathname: pathnameOf(url), hasHash: url.includes("#") }).toEqual({
      pathname: "/editor",
      hasHash: false,
    });
  });

  it.each<EditorOpening>([
    { kind: "latest" },
    { kind: "new" },
    { kind: "flow", id: "flow_1" },
    { kind: "flow", id: "a b/c?d&e#f" },
    { kind: "flow", id: "aná" },
  ])("is read back as the same opening: %j", (opening) => {
    expect(editorOpeningOf(searchOf(editorUrl(opening)))).toEqual(opening);
  });

  it.each<EditorOpening>([{ kind: "latest" }, { kind: "new" }, { kind: "flow", id: "x" }])(
    "always points to the editor: %j",
    (opening) => {
      expect(routeOf(pathnameOf(editorUrl(opening)))).toEqual({ page: "workspace" });
    },
  );
});

describe("editorOpeningOf", () => {
  it.each<[string, EditorOpening]>([
    ["?flow=flow_1", { kind: "flow", id: "flow_1" }],
    ["?flow=a%20b%2Fc", { kind: "flow", id: "a b/c" }],
    ["?new", { kind: "new" }],
    ["", { kind: "latest" }],
    ["?", { kind: "latest" }],
    ["?otra=1", { kind: "latest" }],
  ])("reads %j", (search, opening) => {
    expect(editorOpeningOf(search)).toEqual(opening);
  });

  it("opens the latest flow when the flow id is empty", () => {
    const opening = editorOpeningOf("?flow=");

    expect(opening).toEqual({ kind: "latest" });
  });
});
