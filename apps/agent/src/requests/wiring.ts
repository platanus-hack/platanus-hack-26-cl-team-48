import type { Server } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { ok } from "@nodomics/protocol";
import type { AgentConfig, MemoryMode } from "../config.ts";
import { createAnthropicLlm } from "../llm/anthropic-llm.ts";
import type { Route } from "../http/route.ts";
import { createRouter } from "../http/router.ts";
import { createWhyRoute } from "../http/routes/why.ts";
import { createSearchRoute } from "../http/routes/search.ts";
import { createProposalRoutes } from "../http/routes/proposals.ts";
import { createServer } from "../server.ts";
import { buildMemoryDeps } from "../memory/recording-mcp-deps.ts";
import type { MemoryPort } from "../memory/memory-port.ts";
import { createFakeMemory } from "../memory/fake-memory.ts";
import { createSupabaseMemory, createUserScopedMemory } from "../memory/supabase-memory.ts";
import type { EmbeddingsPort } from "../memory/embeddings.ts";
import { createVoyageEmbeddings } from "../memory/embeddings.ts";
import { createFakeSearchIndex, type SearchIndexPort } from "../memory/search.ts";
import {
  createSupabaseSearchIndex,
  createUserScopedSearchIndex,
} from "../memory/supabase-search.ts";
import { indexComponent } from "../memory/indexer.ts";
import type { FlowLike } from "../memory/component-card.ts";
import type { Proposal } from "../contracts/proposal.ts";
import { createFakeProposalStore } from "../proposals/fake-proposal-store.ts";
import {
  createSupabaseProposalStore,
  createUserScopedProposalStore,
} from "../proposals/supabase-proposal-store.ts";
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

const selectEmbeddings = (
  voyageApiKey: string,
  inputType: "document" | "query" = "document",
): EmbeddingsPort =>
  voyageApiKey === "fake"
    ? { embed: (texts) => Promise.resolve(ok(texts.map(() => [1, 0, 0]))) }
    : createVoyageEmbeddings({ apiKey: voyageApiKey, inputType, fetch });

const selectSearch = (config: AgentConfig) => ({
  embeddings: selectEmbeddings(config.voyageApiKey, "query"),
  index:
    config.memory === "supabase"
      ? createSupabaseSearchIndex(
          createClient<Record<string, never>>(config.supabaseUrl, config.supabaseAnonKey),
        )
      : createFakeSearchIndex(),
});

const selectProposalsForUser = (
  config: AgentConfig,
): ((identity: UserIdentity) => ProposalStorePort | null) | undefined => {
  if (config.memory !== "supabase") return undefined;
  return (identity) => {
    const outcome = createUserScopedProposalStore({
      supabaseUrl: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      accessToken: identity.accessToken,
    });
    return outcome.ok ? outcome.value : null;
  };
};

const selectSearchForUser = (
  config: AgentConfig,
): ((identity: UserIdentity) => SearchIndexPort | null) | undefined => {
  if (config.memory !== "supabase") return undefined;
  return (identity) => {
    const outcome = createUserScopedSearchIndex({
      supabaseUrl: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      accessToken: identity.accessToken,
    });
    return outcome.ok ? outcome.value : null;
  };
};

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
  const proposalsForUser = selectProposalsForUser(config);
  const searchForUser = selectSearchForUser(config);
  return {
    identity: selectIdentity(config),
    llm: createAnthropicLlm({ apiKey: config.anthropicApiKey }),
    mcp: selectMcp(config.mcpUrl),
    proposals: selectProposalStore(config),
    search: selectSearch(config),
    documentEmbeddings: selectEmbeddings(config.voyageApiKey, "document"),
    ...(memoryForUser ? { memoryForUser } : {}),
    ...(proposalsForUser ? { proposalsForUser } : {}),
    ...(searchForUser ? { searchForUser } : {}),
  };
}

const defaultSearch = (): { embeddings: EmbeddingsPort; index: SearchIndexPort } => ({
  embeddings: selectEmbeddings("fake"),
  index: createFakeSearchIndex(),
});

const resolveMemory = (
  deps: RequestDeps,
  fallback: MemoryPort,
  identity: UserIdentity,
): MemoryPort => deps.memoryForUser?.(identity) ?? fallback;

const DEFAULT_CONTEXT = { domain: "nodomics", crop: "general", region: "local" };

async function maybeIndexFlow(
  deps: RequestDeps,
  proposal: Proposal,
  identity: UserIdentity,
): Promise<void> {
  if (!deps.search) return;
  const index = deps.searchForUser?.(identity) ?? deps.search.index;
  const embeddings = deps.documentEmbeddings ?? deps.search.embeddings;
  const read = await deps.mcp.call("flows.get", { flowId: proposal.flowId }, identity);
  if (read.ok && typeof read.value === "object" && read.value !== null) {
    const flow = read.value as FlowLike;
    await indexComponent(
      { embeddings, index },
      {
        flow,
        manifests: {},
        history: [],
        context: DEFAULT_CONTEXT,
      },
    );
  }
}

function resolveProposalRoutes(deps: RequestDeps, memory: MemoryPort): readonly Route[] {
  if (!deps.proposals && !deps.proposalsForUser) return [];
  const store = deps.proposalsForUser
    ? (identity: UserIdentity) =>
        deps.proposalsForUser?.(identity) ?? deps.proposals ?? createFakeProposalStore()
    : (deps.proposals ?? createFakeProposalStore());
  return createProposalRoutes({
    store,
    mcp: deps.mcp,
    recordDecision: (decision, identity) =>
      buildMemoryDeps(resolveMemory(deps, memory, identity)).recordDecision(decision),
    onAccepted: (proposal, _acceptedIds, identity) => maybeIndexFlow(deps, proposal, identity),
  });
}

/** The one place to add routes from other lanes (search, proposals). */
export function buildRoutes(deps: RequestDeps, memory: MemoryPort): readonly Route[] {
  const search = deps.search ?? defaultSearch();
  return [
    createWhyRoute({ memory, llm: deps.llm }),
    createSearchRoute(search),
    ...resolveProposalRoutes(deps, memory),
  ];
}

const MEMORY_FACTORIES: Readonly<Record<MemoryMode, (config: AgentConfig) => MemoryPort>> = {
  fake: () => createFakeMemory(),
  supabase: (config) =>
    createSupabaseMemory(
      createClient<Record<string, never>>(config.supabaseUrl, config.supabaseAnonKey),
    ),
};

export const selectMemory = (config: AgentConfig): MemoryPort =>
  MEMORY_FACTORIES[config.memory](config);

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
