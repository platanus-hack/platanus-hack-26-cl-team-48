import type { AgentConfig } from "../config.ts";
import { createAnthropicLlm } from "../llm/anthropic-llm.ts";
import { createFakeMcp } from "../mcp/fake-mcp.ts";
import { createMcpClient } from "../mcp/mcp-client.ts";
import type { McpPort } from "../mcp/mcp-port.ts";
import type { RequestDeps } from "./handle-request.ts";
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
