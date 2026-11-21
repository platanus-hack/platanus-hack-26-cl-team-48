/** The pages of the app (ADR 0018). The workspace keeps the shared flow in the `#`. */
export type Route =
  | { readonly page: "workspace" }
  | { readonly page: "hub" }
  | { readonly page: "profile"; readonly handle: string }
  | { readonly page: "publication"; readonly handle: string; readonly slug: string };

const WORKSPACE: Route = { page: "workspace" };

export function routeOf(path: string): Route {
  const segments = path
    .split("/")
    .filter((segment) => segment !== "")
    .map(decodeURIComponent);
  const [first, second, third, ...rest] = segments;
  if (rest.length > 0) return WORKSPACE;
  if (first === "hub" && second === undefined) return { page: "hub" };
  if (first === "hub" && second !== undefined && third !== undefined)
    return { page: "publication", handle: second, slug: third };
  if (first === "u" && second !== undefined && third === undefined)
    return { page: "profile", handle: second };
  return WORKSPACE;
}

export function pathOf(route: Route): string {
  switch (route.page) {
    case "workspace":
      return "/";
    case "hub":
      return "/hub";
    case "profile":
      return `/u/${encodeURIComponent(route.handle)}`;
    case "publication":
      return `/hub/${encodeURIComponent(route.handle)}/${encodeURIComponent(route.slug)}`;
  }
}
