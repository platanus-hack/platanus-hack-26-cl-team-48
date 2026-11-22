import type { AgentService } from "./agent-service.ts";
import { createHttpAgentService } from "./http-agent-service.ts";
import { createMemoryAgentService } from "./memory-agent-service.ts";

type AgentEnvironment = { readonly VITE_AGENT_URL?: string };
type AgentSession = { readonly getAccessToken: () => Promise<string | undefined> };

/** The agent service when its URL is configured; otherwise one that says it is not configured. */
export function createAppAgent(
  environment: AgentEnvironment,
  { getAccessToken }: AgentSession,
): AgentService {
  const baseUrl = environment.VITE_AGENT_URL;
  if (baseUrl === undefined || baseUrl === "") return createMemoryAgentService();
  return createHttpAgentService({
    baseUrl,
    getAccessToken,
    fetch: (input, init) => fetch(input, init),
  });
}
