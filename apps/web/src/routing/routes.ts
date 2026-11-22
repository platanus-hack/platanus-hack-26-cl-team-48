/** The pages of the app (ADR 0018, 0024). The workspace keeps the shared flow in the `#`. */
export type Route =
  | { readonly page: "workspace" }
  | { readonly page: "hub" }
  | { readonly page: "profile"; readonly handle: string }
  | { readonly page: "publication"; readonly handle: string; readonly slug: string };

const WORKSPACE: Route = { page: "workspace" };
const HUB: Route = { page: "hub" };
const SHARED_FLOW_PREFIX = "#flow=";
const EDITOR_PATH = "/editor";
const FLOW_PARAM = "flow";
const NEW_PARAM = "new";

/** How the editor opens (ADR 0024): the latest flow, one of mine, or an empty canvas. */
export type EditorOpening =
  | { readonly kind: "latest" }
  | { readonly kind: "flow"; readonly id: string }
  | { readonly kind: "new" };

export function routeOf(path: string): Route {
  const segments = path
    .split("/")
    .filter((segment) => segment !== "")
    .map(decodeURIComponent);
  const [first, second, third, ...rest] = segments;
  if (rest.length > 0) return HUB;
  if (first === "editor" && second === undefined) return WORKSPACE;
  if (first === "hub" && second !== undefined && third !== undefined)
    return { page: "publication", handle: second, slug: third };
  if (first === "u" && second !== undefined && third === undefined)
    return { page: "profile", handle: second };
  return HUB;
}

/** Old shared links point at `/#flow=…`, from before the hub became the home page. */
export function routeOfLocation({
  pathname,
  hash,
}: {
  readonly pathname: string;
  readonly hash: string;
}): Route {
  const isRoot = pathname.split("/").every((segment) => segment === "");
  return isRoot && hash.startsWith(SHARED_FLOW_PREFIX) ? WORKSPACE : routeOf(pathname);
}

export function editorUrl(opening: EditorOpening): string {
  switch (opening.kind) {
    case "latest":
      return EDITOR_PATH;
    case "flow":
      return `${EDITOR_PATH}?${new URLSearchParams({ [FLOW_PARAM]: opening.id }).toString()}`;
    case "new":
      return `${EDITOR_PATH}?${NEW_PARAM}`;
  }
}

export function editorOpeningOf(search: string): EditorOpening {
  const params = new URLSearchParams(search);
  const id = params.get(FLOW_PARAM);
  if (id !== null && id !== "") return { kind: "flow", id };
  return params.has(NEW_PARAM) ? { kind: "new" } : { kind: "latest" };
}

export function pathOf(route: Route): string {
  switch (route.page) {
    case "workspace":
      return EDITOR_PATH;
    case "hub":
      return "/";
    case "profile":
      return `/u/${encodeURIComponent(route.handle)}`;
    case "publication":
      return `/hub/${encodeURIComponent(route.handle)}/${encodeURIComponent(route.slug)}`;
  }
}
