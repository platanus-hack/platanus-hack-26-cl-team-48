import type { FeedService } from "./feed-service.ts";
import { createHttpFeedService } from "./http-feed-service.ts";
import { createMemoryFeedService } from "./memory-feed-service.ts";

type FeedSession = {
  readonly getAccessToken: () => Promise<string | undefined>;
  readonly currentHandle: () => Promise<string | undefined>;
};

type FeedEnvironment = { readonly VITE_AGENT_URL?: string };

/**
 * The agent service when its URL is configured (ADR 0022); otherwise an empty in-memory Feed, so
 * the hub still runs for anyone who clones the repository without the agent.
 */
export function createAppFeed(
  environment: FeedEnvironment,
  { getAccessToken, currentHandle }: FeedSession,
): FeedService {
  const baseUrl = environment.VITE_AGENT_URL;
  if (baseUrl === undefined || baseUrl === "")
    return createMemoryFeedService({ cards: {}, currentHandle });
  return createHttpFeedService({
    baseUrl,
    getAccessToken,
    fetch: (input, init) => fetch(input, init),
  });
}
