import { FEED_PATHS } from "@nodomics/profile";
import { parse } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { Route, RouteReply, RouteRequest } from "../http/route.ts";
import type { UserIdentity } from "../mcp/mcp-port.ts";
import type { EmbeddingsPort } from "../memory/embeddings.ts";
import {
  findMatches,
  saveProfile,
  searchFeed,
  type FeedServiceDeps,
  type SaveProfileError,
} from "./feed-service.ts";
import type { FeedStorePort } from "./feed-store-port.ts";
import { loadFeedMap } from "./feed-map.ts";
import { parseJson } from "./parse-json.ts";
import { createRegistrationRoute, type RegistrationRouteDeps } from "./registration-route.ts";

export type FeedRoutesDeps = RegistrationRouteDeps & {
  readonly storeFor: (identity: UserIdentity) => FeedStorePort;
  readonly documentEmbeddings: EmbeddingsPort;
  readonly queryEmbeddings: EmbeddingsPort;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

const SaveProfileBody = Type.Object({ card: Type.Unknown() }, { additionalProperties: false });

const reply = (status: number, error: string): RouteReply => ({ status, body: { error } });
const INVALID_QUERY = reply(400, "invalid_query");
const STORE_UNAVAILABLE = reply(502, "store_unavailable");
const EMBEDDINGS_UNAVAILABLE = reply(502, "embeddings_unavailable");

export function createFeedRoutes(deps: FeedRoutesDeps): readonly Route[] {
  const serviceFor = (identity: UserIdentity): FeedServiceDeps => ({
    store: deps.storeFor(identity),
    documentEmbeddings: deps.documentEmbeddings,
    queryEmbeddings: deps.queryEmbeddings,
  });
  return [
    route("POST", FEED_PATHS.profile, (request) =>
      handleSave(serviceFor(request.identity), request),
    ),
    {
      ...route("GET", FEED_PATHS.card, (request) =>
        handleCard(deps.storeFor(request.identity), request),
      ),
      isPublic: true,
    },
    route("GET", FEED_PATHS.search, (request) =>
      handleSearch(serviceFor(request.identity), request),
    ),
    route("GET", FEED_PATHS.matches, (request) =>
      handleMatches(serviceFor(request.identity), request),
    ),
    route("GET", FEED_PATHS.map, (request) => handleMap(serviceFor(request.identity), request)),
    createRegistrationRoute(deps),
  ];
}

async function handleMap(deps: FeedServiceDeps, request: RouteRequest): Promise<RouteReply> {
  const query = request.query["q"]?.trim();
  if (query && query.length > MAX_QUERY_LENGTH) return INVALID_QUERY;
  const found = await loadFeedMap(deps, request.identity.userId, query);
  if (found.ok) return { status: 200, body: { people: found.value } };
  return found.error.code === "EMBEDDINGS_UNAVAILABLE" ? EMBEDDINGS_UNAVAILABLE : STORE_UNAVAILABLE;
}

const route = (method: Route["method"], path: string, handle: Route["handle"]): Route => ({
  method,
  path,
  handle,
});

function saveErrorReply(error: SaveProfileError): RouteReply {
  if (error.code === "INVALID_CARD")
    return { status: 400, body: { error: "invalid_card", issues: error.issues } };
  return error.code === "EMBEDDINGS_UNAVAILABLE" ? EMBEDDINGS_UNAVAILABLE : STORE_UNAVAILABLE;
}

async function handleSave(deps: FeedServiceDeps, request: RouteRequest): Promise<RouteReply> {
  const body = parseJson(request.rawBody);
  const parsed = body.ok ? parse(SaveProfileBody, body.value) : undefined;
  if (!parsed?.ok) return reply(400, "invalid_body");
  const saved = await saveProfile(deps, request.identity.userId, parsed.value.card);
  return saved.ok ? { status: 200, body: { card: saved.value } } : saveErrorReply(saved.error);
}

async function handleCard(store: FeedStorePort, request: RouteRequest): Promise<RouteReply> {
  const found = await store.getCardByHandle(request.params["handle"] ?? "");
  if (!found.ok) return STORE_UNAVAILABLE;
  return found.value ? { status: 200, body: { card: found.value } } : reply(404, "no_profile");
}

async function handleSearch(deps: FeedServiceDeps, request: RouteRequest): Promise<RouteReply> {
  const query = request.query["q"]?.trim();
  const limit = parseLimit(request.query["k"]);
  if (!query || query.length > MAX_QUERY_LENGTH || limit === null) return INVALID_QUERY;
  const found = await searchFeed(deps, query, limit);
  if (found.ok) return { status: 200, body: { results: found.value } };
  return found.error.code === "EMBEDDINGS_UNAVAILABLE" ? EMBEDDINGS_UNAVAILABLE : STORE_UNAVAILABLE;
}

async function handleMatches(deps: FeedServiceDeps, request: RouteRequest): Promise<RouteReply> {
  const limit = parseLimit(request.query["k"]);
  if (limit === null) return INVALID_QUERY;
  const found = await findMatches(deps, request.identity.userId, limit);
  if (found.ok) return { status: 200, body: { results: found.value } };
  return found.error.code === "NO_PROFILE" ? reply(404, "no_profile") : STORE_UNAVAILABLE;
}

function parseLimit(raw: string | undefined): number | null {
  if (raw === undefined) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) return null;
  const limit = Number(raw);
  return limit >= 1 && limit <= MAX_LIMIT ? limit : null;
}
