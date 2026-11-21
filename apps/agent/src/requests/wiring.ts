import type { Server } from "node:http";
import type { AgentConfig } from "../config.ts";
import { createAnthropicLlm } from "../llm/anthropic-llm.ts";
import type { Route } from "../http/route.ts";
import { createRouter } from "../http/router.ts";
import { createWhyRoute } from "../http/routes/why.ts";
import { createServer } from "../server.ts";
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

/** The one place to add routes from other lanes (search, proposals). Memory is in-process for now. */
export function buildRoutes(deps: RequestDeps): readonly Route[] {
  const memory = createFakeMemory();
  return [createWhyRoute({ memory, llm: deps.llm })];
}

/** The LLM and identity are created once and shared by /agent/requests and the router. */
export function buildServer(config: AgentConfig): Server {
  const deps = buildRequestDeps(config);
  const router = createRouter({ identity: deps.identity, routes: buildRoutes(deps) });
  return createServer({ handleRequest: createHandleRequest(deps), router });
}
