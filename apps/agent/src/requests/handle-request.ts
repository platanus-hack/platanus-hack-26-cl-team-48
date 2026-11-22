import type { LlmPort } from "../llm/llm-port.ts";
import {
  runAgentLoop,
  type AgentEvent,
  type LoopError,
  type LoopLimits,
  type LoopOutcome,
} from "../loop/agent-loop.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";
import { buildProposal } from "../proposals/build-proposal.ts";
import type { ProposalStorePort } from "../proposals/proposal-store-port.ts";
import type { MemoryPort } from "../memory/memory-port.ts";
import { buildMemoryDeps } from "../memory/recording-mcp-deps.ts";
import type { EmbeddingsPort } from "../memory/embeddings.ts";
import type { SearchIndexPort } from "../memory/search.ts";
import type { RateLimiter } from "../http/guards/rate-limit.ts";
import type { StructuredLogger } from "../http/guards/logger.ts";
import type { ImportReport } from "../import/import-report.ts";
import type { RouteReply } from "../http/route.ts";
import type { SandboxMcpInput } from "../sandbox/mcp-proxy-route.ts";
import { SYSTEM_PROMPT } from "../prompts/system.ts";
import { REQUEST_ALLOWLIST } from "./allowlists.ts";
import { recordDrafts } from "./draft-recorder.ts";
import { parseBearer, type AuthError, type IdentityPort } from "./identity.ts";
import { parseRequestBody, toGoalMessage } from "./request-body.ts";

export type RequestDeps = {
  readonly identity: IdentityPort;
  readonly llm: LlmPort;
  readonly mcp: McpPort;
  readonly proposals?: ProposalStorePort;
  readonly proposalsForUser?: (identity: UserIdentity) => ProposalStorePort | null;
  readonly limits?: LoopLimits;
  readonly memoryForUser?: (identity: UserIdentity) => MemoryPort | null;
  readonly search?: { readonly embeddings: EmbeddingsPort; readonly index: SearchIndexPort };
  readonly searchForUser?: (identity: UserIdentity) => SearchIndexPort | null;
  readonly documentEmbeddings?: EmbeddingsPort;
  readonly rateLimiter?: RateLimiter;
  readonly logger?: StructuredLogger;
  readonly sandboxMcp?: (input: SandboxMcpInput) => Promise<RouteReply>;
};

export type RequestInput = {
  readonly authorization: string | undefined;
  readonly rawBody: string;
  /** Receives what the agent does while it works, for replies streamed to the client. */
  readonly onEvent?: (event: AgentEvent) => void;
};

export type HttpReply = { readonly status: number; readonly body: unknown };

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_GATEWAY_TIMEOUT = 504;

const reply = (status: number, error: string): HttpReply => ({ status, body: { error } });

const authFailure = (error: AuthError): HttpReply =>
  error.code === "UNAUTHORIZED"
    ? reply(HTTP_UNAUTHORIZED, "unauthorized")
    : reply(HTTP_BAD_GATEWAY, "upstream_unavailable");

const loopFailure = (error: LoopError): HttpReply =>
  error.code === "timeout"
    ? reply(HTTP_GATEWAY_TIMEOUT, "timeout")
    : reply(HTTP_BAD_GATEWAY, "upstream_unavailable");

type ProposalPayload = {
  readonly proposalId: string;
  readonly cards: readonly unknown[];
};

type SuccessDetails = {
  readonly draftId?: string;
  readonly proposalData?: ProposalPayload | null;
  readonly importReport?: ImportReport;
};

function success(outcome: LoopOutcome, details: SuccessDetails = {}): HttpReply {
  const body = {
    summary: outcome.text,
    steps: outcome.steps,
    ...(details.draftId ? { draftId: details.draftId } : {}),
    ...(details.proposalData
      ? { proposalId: details.proposalData.proposalId, cards: details.proposalData.cards }
      : {}),
    ...(details.importReport ? { importReport: details.importReport } : {}),
  };
  return { status: HTTP_OK, body };
}

const withSystemPrompt = (llm: LlmPort): LlmPort => ({
  complete: (request) => llm.complete({ ...request, system: SYSTEM_PROMPT }),
});

async function buildProposalData(
  deps: RequestDeps,
  identity: UserIdentity,
  input: {
    readonly draftId: string;
    readonly flowId: string;
    readonly importReport?: ImportReport | undefined;
  },
): Promise<ProposalPayload | null | "failed"> {
  const store = deps.proposalsForUser?.(identity) ?? deps.proposals;
  if (!store) return null;
  const outcome = await buildProposal({
    mcp: deps.mcp,
    llm: deps.llm,
    identity,
    draftId: input.draftId,
    flowId: input.flowId,
  });
  if (!outcome.ok) {
    deps.logger?.warn("proposal not built", {
      code: outcome.error.code,
      message: outcome.error.message,
    });
    return "failed";
  }
  if (!outcome.value) return null;
  const { proposal, cards } = outcome.value;
  const saved = await store.save({
    proposal,
    cards,
    ownerId: identity.userId,
    ...(input.importReport ? { importReport: input.importReport } : {}),
  });
  if (!saved.ok) {
    deps.logger?.warn("proposal not saved", { code: saved.error.code });
    return "failed";
  }
  return { proposalId: proposal.id, cards };
}

async function runRequest(
  deps: RequestDeps,
  identity: UserIdentity,
  request: {
    readonly goal: string;
    readonly flowId?: string | undefined;
    readonly onEvent?: ((event: AgentEvent) => void) | undefined;
  },
): Promise<HttpReply> {
  const userMemory = deps.memoryForUser ? deps.memoryForUser(identity) : null;
  const mcp = userMemory ? buildMemoryDeps(userMemory).wrapMcp(deps.mcp) : deps.mcp;
  const recorder = recordDrafts(mcp);
  const outcome = await runAgentLoop({
    llm: withSystemPrompt(deps.llm),
    mcp: recorder.mcp,
    identity,
    goal: request.goal,
    allowlist: REQUEST_ALLOWLIST,
    ...(deps.limits ? { limits: deps.limits } : {}),
    ...(request.onEvent ? { onEvent: request.onEvent } : {}),
  });
  if (!outcome.ok) {
    deps.logger?.error("agent loop failed", {
      code: outcome.error.code,
      message: outcome.error.message,
    });
    return loopFailure(outcome.error);
  }
  const draftId = recorder.lastDraftId();
  const flowId = request.flowId ?? recorder.lastFlowId() ?? draftId;
  const importReport = recorder.lastImportReport();
  const proposal =
    draftId && flowId
      ? await buildProposalData(deps, identity, { draftId, flowId, importReport })
      : null;
  const answer =
    proposal === "failed"
      ? {
          ...outcome.value,
          text:
            outcome.value.text +
            "\n\nNo se pudo preparar o guardar la propuesta. Ningún cambio se ha aplicado. Puedes volver a pedirlo.",
        }
      : outcome.value;
  return success(answer, {
    ...(draftId ? { draftId } : {}),
    ...(proposal && proposal !== "failed" ? { proposalData: proposal } : {}),
    ...(importReport ? { importReport } : {}),
  });
}

export function createHandleRequest(deps: RequestDeps) {
  return async (input: RequestInput): Promise<HttpReply> => {
    const identity = await deps.identity.resolve(parseBearer(input.authorization));
    if (!identity.ok) return authFailure(identity.error);
    if (deps.rateLimiter && !deps.rateLimiter.check(identity.value.userId)) {
      return reply(HTTP_RATE_LIMITED, "rate_limit_exceeded");
    }
    const body = parseRequestBody(input.rawBody);
    if (!body.ok) return reply(HTTP_BAD_REQUEST, body.error);
    return runRequest(deps, identity.value, {
      goal: toGoalMessage(body.value),
      flowId: body.value.flowId,
      onEvent: input.onEvent,
    });
  };
}
