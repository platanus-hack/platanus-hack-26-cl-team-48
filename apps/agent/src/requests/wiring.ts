import type { Server } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { ok } from "@nodomics/protocol";
import type { AgentConfig, MemoryMode } from "../config.ts";
import { createAnthropicLlm } from "../llm/anthropic-llm.ts";
import type { Route } from "../http/route.ts";
import { createRouter } from "../http/router.ts";
import { createWhyRoute } from "../http/routes/why.ts";
import { createSearchRoute } from "../http/routes/search.ts";
import { createServer } from "../server.ts";
import { buildMemoryDeps } from "../memory/recording-mcp-deps.ts";
import type { MemoryPort } from "../memory/memory-port.ts";
import { createFakeMemory } from "../memory/fake-memory.ts";
import { createUserScopedMemory } from "../memory/supabase-memory.ts";
import type { EmbeddingsPort } from "../memory/embeddings.ts";
import { createVoyageEmbeddings } from "../memory/embeddings.ts";
import { createFakeSearchIndex, type SearchIndexPort } from "../memory/search.ts";
import { createFakeProposalStore } from "../proposals/fake-proposal-store.ts";
import { createSupabaseProposalStore } from "../proposals/supabase-proposal-store.ts";
import type { ProposalStorePort } from "../proposals/proposal-store-port.ts";
import { createFakeMcp } from "../mcp/fake-mcp.ts";
import { createMcpClient } from "../mcp/mcp-client.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";
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

const selectProposalStore = (config: AgentConfig): ProposalStorePort =>
  config.memory === "supabase"
    ? createSupabaseProposalStore(
        createClient<Record<string, never>>(config.supabaseUrl, config.supabaseAnonKey),
      )
    : createFakeProposalStore();

const selectEmbeddings = (voyageApiKey: string): EmbeddingsPort =>
  voyageApiKey === "fake"
    ? { embed: (texts) => Promise.resolve(ok(texts.map(() => [1, 0, 0]))) }
    : createVoyageEmbeddings({ apiKey: voyageApiKey, fetch });

const selectSearch = (config: AgentConfig) => ({
  embeddings: selectEmbeddings(config.voyageApiKey),
  index: createFakeSearchIndex(),
});

const selectMemoryForUser = (
  config: AgentConfig,
): ((identity: UserIdentity) => MemoryPort | null) | undefined => {
  if (config.memory !== "supabase") return undefined;
  return (identity) => {
    const outcome = createUserScopedMemory({
      supabaseUrl: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      accessToken: identity.accessToken,
    });
    return outcome.ok ? outcome.value : null;
  };
};

export function buildRequestDeps(config: AgentConfig): RequestDeps {
  const memoryForUser = selectMemoryForUser(config);
  return {
    identity: selectIdentity(config),
    llm: createAnthropicLlm({ apiKey: config.anthropicApiKey }),
    mcp: selectMcp(config.mcpUrl),
    proposals: selectProposalStore(config),
    search: selectSearch(config),
    ...(memoryForUser ? { memoryForUser } : {}),
  };
}

const defaultSearch = (): { embeddings: EmbeddingsPort; index: SearchIndexPort } => ({
  embeddings: selectEmbeddings("fake"),
  index: createFakeSearchIndex(),
});

/** The one place to add routes from other lanes (search, proposals). */
export function buildRoutes(deps: RequestDeps, memory: MemoryPort): readonly Route[] {
  const search = deps.search ?? defaultSearch();
  return [
    createWhyRoute({ memory, llm: deps.llm }),
    createSearchRoute(search),
    // createProposalRoutes({ store: deps.proposals, mcp: deps.mcp })
  ];
}

/** The supabase entry becomes the user-scoped Supabase memory once the memory lane exports it. */
const MEMORY_FACTORIES: Readonly<Record<MemoryMode, () => MemoryPort>> = {
  fake: createFakeMemory,
  supabase: createFakeMemory,
};

export const selectMemory = (config: AgentConfig): MemoryPort => MEMORY_FACTORIES[config.memory]();

/** One memory serves both the recording MCP of /agent/requests and the router. */
export function assembleServer(deps: RequestDeps, memory: MemoryPort): Server {
  const recorded = deps.memoryForUser
    ? deps
    : { ...deps, mcp: buildMemoryDeps(memory).wrapMcp(deps.mcp) };
  const router = createRouter({ identity: deps.identity, routes: buildRoutes(deps, memory) });
  return createServer({ handleRequest: createHandleRequest(recorded), router });
}

/** The LLM, identity and memory are created once and shared by /agent/requests and the router. */
export function buildServer(config: AgentConfig): Server {
  return assembleServer(buildRequestDeps(config), selectMemory(config));
}
