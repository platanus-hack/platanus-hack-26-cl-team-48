import type { Route, RouteReply, RouteRequest } from "../route.ts";
import type { EmbeddingsPort } from "../../memory/embeddings.ts";
import { searchComponents, type SearchIndexPort } from "../../memory/search.ts";

type SearchRouteDeps = { readonly embeddings: EmbeddingsPort; readonly index: SearchIndexPort };
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const MAX_QUERY_LENGTH = 200;

export function createSearchRoute(deps: SearchRouteDeps): Route {
  return { method: "GET", path: "/agent/search", handle: (request) => handleSearch(deps, request) };
}

async function handleSearch(deps: SearchRouteDeps, request: RouteRequest): Promise<RouteReply> {
  const query = request.query["q"]?.trim();
  const limit = parseLimit(request.query["k"]);
  if (!query || query.length > MAX_QUERY_LENGTH || limit === null)
    return { status: 400, body: { error: "invalid_query" } };
  const result = await searchComponents(deps, query, limit);
  return result.ok
    ? { status: 200, body: { cards: result.value } }
    : { status: 502, body: { error: "search_unavailable" } };
}

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) return null;
  const limit = Number(raw);
  return limit >= 1 && limit <= MAX_LIMIT ? limit : null;
}
