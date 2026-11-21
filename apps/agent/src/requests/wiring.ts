import type { Server } from "node:http";
import type { AgentConfig, MemoryMode } from "../config.ts";
import { createAnthropicLlm } from "../llm/anthropic-llm.ts";
import type { Route } from "../http/route.ts";
import { createRouter } from "../http/router.ts";
import { createWhyRoute } from "../http/routes/why.ts";
import { buildFeedRoutes } from "../feed/feed-wiring.ts";
import { createServer } from "../server.ts";
import { buildMemoryDeps } from "../memory/recording-mcp-deps.ts";
import type { MemoryPort } from "../memory/memory-port.ts";
import { createFakeMemory } from "../memory/fake-memory.ts";
import { createFakeMcp } from "../mcp/fake-mcp.ts";
import { createMcpClient } from "../mcp/mcp-client.ts";
import type { McpPort } from "../mcp/mcp-port.ts";
import { createHandleRequest, type RequestDeps } from "./handle-request.ts";
import { createDevIdentity, createSupabaseIdentity, type IdentityPort } from "./identity.ts";

const FAKE_MCP = "fake";

const selectMcp = (mcpUrl: string): McpPort =>
  mcpUrl === FAKE_MCP ? createFakeMcp() : createMcpClient({ url: mcpUrl });

const selectIdentity = (config: AgentConfig): IdentityPort =>
  config.devIdentity
    ? createDevIdentity()
    : createSupabaseIdentity({
        supabaseUrl: config.supabaseUrl,
        anonKey: config.supabaseAnonKey,
        fetch,
      });

export function buildRequestDeps(config: AgentConfig): RequestDeps {
  return {
    identity: selectIdentity(config),
    llm: createAnthropicLlm({ apiKey: config.anthropicApiKey }),
    mcp: selectMcp(config.mcpUrl),
  };
}

/** The one place to add routes from other lanes (search, proposals). */
export function buildRoutes(deps: RequestDeps, memory: MemoryPort): readonly Route[] {
  return [createWhyRoute({ memory, llm: deps.llm })];
}

/** The supabase entry becomes the user-scoped Supabase memory once the memory lane exports it. */
const MEMORY_FACTORIES: Readonly<Record<MemoryMode, () => MemoryPort>> = {
  fake: createFakeMemory,
  supabase: createFakeMemory,
};

export const selectMemory = (config: AgentConfig): MemoryPort => MEMORY_FACTORIES[config.memory]();

/**
 * One memory serves both the recording MCP of /agent/requests and the router.
 * Lanes that need the full config (the feed) pass their routes as `extraRoutes`.
 */
export function assembleServer(
  deps: RequestDeps,
  memory: MemoryPort,
  extraRoutes: readonly Route[] = [],
): Server {
  const recorded = { ...deps, mcp: buildMemoryDeps(memory).wrapMcp(deps.mcp) };
  const router = createRouter({
    identity: deps.identity,
    routes: [...buildRoutes(deps, memory), ...extraRoutes],
  });
  return createServer({ handleRequest: createHandleRequest(recorded), router });
}

/** The LLM, identity and memory are created once and shared by /agent/requests and the router. */
export function buildServer(config: AgentConfig): Server {
  return assembleServer(buildRequestDeps(config), selectMemory(config), buildFeedRoutes(config));
}
