import { parseBearer, type IdentityPort } from "../requests/identity.ts";
import { MAX_BODY_BYTES, UPLOAD_MAX_BODY_BYTES } from "./guards/body-limit.ts";
import type { Route, RouteReply, RouteRequest } from "./route.ts";

export type RouterInput = {
  readonly method: string;
  readonly url: string;
  readonly authorization: string | undefined;
  readonly rawBody: string;
};

export type Router = {
  readonly dispatch: (input: RouterInput) => Promise<RouteReply | undefined>;
  readonly maxBodyBytes?: (method: string, url: string) => number;
};

export type RouterDeps = {
  readonly identity: IdentityPort;
  readonly routes: readonly Route[];
};

type Match = {
  readonly route: Route;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
};

const BASE_URL = "http://localhost";
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;

const errorReply = (status: number, error: string): RouteReply => ({ status, body: { error } });

const segmentsOf = (path: string): readonly string[] => path.split("/").filter(Boolean);

function matchParams(
  pattern: readonly string[],
  actual: readonly string[],
): Record<string, string> | undefined {
  if (pattern.length !== actual.length) return undefined;
  const params: Record<string, string> = {};
  for (const [index, part] of pattern.entries()) {
    const value = actual[index] ?? "";
    if (!part.startsWith(":")) {
      if (part !== value) return undefined;
    } else {
      params[part.slice(1)] = value;
    }
  }
  return params;
}

function decodeSegments(path: string): readonly string[] | undefined {
  try {
    return segmentsOf(path).map(decodeURIComponent);
  } catch {
    return undefined;
  }
}

function findMatch(routes: readonly Route[], input: RouterInput): Match | undefined {
  const url = URL.parse(input.url, BASE_URL);
  const actual = url ? decodeSegments(url.pathname) : undefined;
  if (!url || !actual) return undefined;
  for (const route of routes) {
    const params =
      route.method === input.method ? matchParams(segmentsOf(route.path), actual) : undefined;
    if (params) return { route, params, query: Object.fromEntries(url.searchParams) };
  }
  return undefined;
}

async function run(deps: RouterDeps, match: Match, input: RouterInput): Promise<RouteReply> {
  const identity = await deps.identity.resolve(parseBearer(input.authorization));
  if (!identity.ok) {
    return identity.error.code === "UNAUTHORIZED"
      ? errorReply(HTTP_UNAUTHORIZED, "unauthorized")
      : errorReply(HTTP_BAD_GATEWAY, "upstream_unavailable");
  }
  const request: RouteRequest = {
    params: match.params,
    query: match.query,
    identity: identity.value,
    rawBody: input.rawBody,
  };
  return match.route.handle(request);
}

function resolveMaxBody(routes: readonly Route[], method: string, url: string): number {
  const match = findMatch(routes, { method, url, authorization: undefined, rawBody: "" });
  if (match?.route.maxBodyBytes !== undefined) return match.route.maxBodyBytes;
  const path = URL.parse(url, BASE_URL)?.pathname ?? "";
  return path.includes("register") || path.includes("upload")
    ? UPLOAD_MAX_BODY_BYTES
    : MAX_BODY_BYTES;
}

export function createRouter(deps: RouterDeps): Router {
  return {
    dispatch: async (input) => {
      const match = findMatch(deps.routes, input);
      if (!match) return undefined;
      try {
        return await run(deps, match, input);
      } catch {
        return errorReply(HTTP_INTERNAL_ERROR, "internal_error");
      }
    },
    maxBodyBytes: (method, url) => resolveMaxBody(deps.routes, method, url),
  };
}
