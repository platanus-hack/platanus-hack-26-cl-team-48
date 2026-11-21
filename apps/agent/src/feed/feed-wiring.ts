import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AgentConfig } from "../config.ts";
import type { Route } from "../http/route.ts";
import { createVoyageEmbeddings } from "../memory/embeddings.ts";
import { createAnthropicProfileExtractor } from "./anthropic-profile-extractor.ts";
import { createFeedRoutes } from "./feed-routes.ts";
import { FEED_EMBEDDING_MODEL } from "./feed-service.ts";
import { createGithubSummary } from "./github-summary.ts";
import { createSupabaseFeedStore } from "./supabase-feed-store.ts";

const newClient: (...args: Parameters<typeof createClient>) => SupabaseClient = createClient;

/** The store is user-scoped so row level security (profile_id = auth.uid()) applies. */
export function buildFeedRoutes(
  config: AgentConfig,
  fetchImpl: typeof fetch = fetch,
): readonly Route[] {
  const embeddings = (inputType: "document" | "query") =>
    createVoyageEmbeddings({
      apiKey: config.voyageApiKey,
      model: FEED_EMBEDDING_MODEL,
      inputType,
      fetch: fetchImpl,
    });
  return createFeedRoutes({
    storeFor: (identity) =>
      createSupabaseFeedStore(
        newClient(config.supabaseUrl, config.supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${identity.accessToken}` } },
          auth: { persistSession: false },
        }),
      ),
    documentEmbeddings: embeddings("document"),
    queryEmbeddings: embeddings("query"),
    extractor: createAnthropicProfileExtractor(new Anthropic({ apiKey: config.anthropicApiKey })),
    github: createGithubSummary(fetchImpl),
  });
}
