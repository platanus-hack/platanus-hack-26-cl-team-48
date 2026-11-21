import type { LlmPort } from "../llm/llm-port.ts";
import {
  runAgentLoop,
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
  readonly limits?: LoopLimits;
  readonly memoryForUser?: (identity: UserIdentity) => MemoryPort | null;
  readonly search?: { readonly embeddings: EmbeddingsPort; readonly index: SearchIndexPort };
};

export type RequestInput = {
  readonly authorization: string | undefined;
  readonly rawBody: string;
};

export type HttpReply = { readonly status: number; readonly body: unknown };

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
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

function success(
  outcome: LoopOutcome,
  draftId: string | undefined,
  proposalData: ProposalPayload | null,
): HttpReply {
  const body = {
    summary: outcome.text,
    steps: outcome.steps,
    ...(draftId ? { draftId } : {}),
    ...(proposalData ? { proposalId: proposalData.proposalId, cards: proposalData.cards } : {}),
  };
  return { status: HTTP_OK, body };
}

const withSystemPrompt = (llm: LlmPort): LlmPort => ({
  complete: (request) => llm.complete({ ...request, system: SYSTEM_PROMPT }),
});

async function buildProposalData(
  deps: RequestDeps,
  identity: UserIdentity,
  input: { readonly draftId: string; readonly flowId?: string | undefined },
): Promise<ProposalPayload | null> {
  if (!deps.proposals) return null;
  const outcome = await buildProposal({
    mcp: deps.mcp,
    llm: deps.llm,
    identity,
    draftId: input.draftId,
    flowId: input.flowId ?? input.draftId,
  });
  if (!outcome.ok || !outcome.value) return null;
  const { proposal, cards } = outcome.value;
  await deps.proposals.save({ proposal, cards, ownerId: identity.userId });
  return { proposalId: proposal.id, cards };
}

async function runRequest(
  deps: RequestDeps,
  identity: UserIdentity,
  request: { readonly goal: string; readonly flowId?: string | undefined },
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
  });
  if (!outcome.ok) return loopFailure(outcome.error);
  const draftId = recorder.lastDraftId();
  const proposal = draftId
    ? await buildProposalData(deps, identity, { draftId, flowId: request.flowId })
    : null;
  return success(outcome.value, draftId, proposal);
}

export function createHandleRequest(deps: RequestDeps) {
  return async (input: RequestInput): Promise<HttpReply> => {
    const identity = await deps.identity.resolve(parseBearer(input.authorization));
    if (!identity.ok) return authFailure(identity.error);
    const body = parseRequestBody(input.rawBody);
    if (!body.ok) return reply(HTTP_BAD_REQUEST, body.error);
    return runRequest(deps, identity.value, {
      goal: toGoalMessage(body.value),
      flowId: body.value.flowId,
    });
  };
}
