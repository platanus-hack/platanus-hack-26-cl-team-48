import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "../config.ts";
import type { Route } from "../http/route.ts";
import { createVoyageEmbeddings } from "../memory/embeddings.ts";
import { createUserScopedClient, type ClientFactory } from "../supabase/user-scoped-client.ts";
import { createAnthropicProfileExtractor } from "./anthropic-profile-extractor.ts";
import { createFeedRoutes } from "./feed-routes.ts";
import { FEED_EMBEDDING_MODEL } from "./feed-service.ts";
import type { FeedStorePort } from "./feed-store-port.ts";
import { createGithubSummary } from "./github-summary.ts";
import { createSupabaseFeedStore } from "./supabase-feed-store.ts";
import type { UserIdentity } from "../mcp/mcp-port.ts";

export type FeedWiringOptions = {
  readonly fetch?: typeof fetch;
  readonly clientFactory?: ClientFactory;
};

const UNAUTHORIZED = { status: 401, body: { error: "unauthorized" } } as const;

/** An identity without a token cannot act under row level security, so it never reaches the store. */
const requireAccessToken = (route: Route): Route => ({
  ...route,
  handle: (request) =>
    request.identity.accessToken === "" ? Promise.resolve(UNAUTHORIZED) : route.handle(request),
});

export function buildFeedRoutes(
  config: AgentConfig,
  options: FeedWiringOptions = {},
): readonly Route[] {
  const fetchImpl = options.fetch ?? fetch;
  const embeddings = (inputType: "document" | "query") =>
    createVoyageEmbeddings({
      apiKey: config.voyageApiKey,
      model: FEED_EMBEDDING_MODEL,
      inputType,
      fetch: fetchImpl,
    });
  const storeFor = (identity: UserIdentity): FeedStorePort => {
    const scope = {
      url: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      accessToken: identity.accessToken,
    };
    const client = createUserScopedClient(scope, options.clientFactory);
    // The token guard runs first, so only a service role key in the config gets here.
    if (!client.ok) throw new Error(`Feed store unavailable: ${client.error.code}`);
    return createSupabaseFeedStore(client.value);
  };
  return createFeedRoutes({
    storeFor,
    documentEmbeddings: embeddings("document"),
    queryEmbeddings: embeddings("query"),
    extractor: createAnthropicProfileExtractor(new Anthropic({ apiKey: config.anthropicApiKey })),
    github: createGithubSummary(fetchImpl),
  }).map(requireAccessToken);
}
