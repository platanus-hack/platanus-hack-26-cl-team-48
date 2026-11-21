import type { LlmPort } from "../llm/llm-port.ts";
import { runAgentLoop, type LoopError, type LoopLimits, type LoopOutcome } from "../loop/agent-loop.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";
import { SYSTEM_PROMPT } from "../prompts/system.ts";
import { REQUEST_ALLOWLIST } from "./allowlists.ts";
import { recordDrafts } from "./draft-recorder.ts";
import { parseBearer, type AuthError, type IdentityPort } from "./identity.ts";
import { parseRequestBody, toGoalMessage } from "./request-body.ts";

export type RequestDeps = {
  readonly identity: IdentityPort;
  readonly llm: LlmPort;
  readonly mcp: McpPort;
  readonly limits?: LoopLimits;
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

function success(outcome: LoopOutcome, draftId: string | undefined): HttpReply {
  const body = { summary: outcome.text, steps: outcome.steps };
  return { status: HTTP_OK, body: draftId === undefined ? body : { draftId, ...body } };
}

/** The loop ships a generic prompt; the request flow replaces it with the product prompt. */
const withSystemPrompt = (llm: LlmPort): LlmPort => ({
  complete: (request) => llm.complete({ ...request, system: SYSTEM_PROMPT }),
});

async function runRequest(
  deps: RequestDeps,
  identity: UserIdentity,
  goal: string,
): Promise<HttpReply> {
  const recorder = recordDrafts(deps.mcp);
  const outcome = await runAgentLoop({
    llm: withSystemPrompt(deps.llm),
    mcp: recorder.mcp,
    identity,
    goal,
    allowlist: REQUEST_ALLOWLIST,
    ...(deps.limits ? { limits: deps.limits } : {}),
  });
  return outcome.ok ? success(outcome.value, recorder.lastDraftId()) : loopFailure(outcome.error);
}

export function createHandleRequest(deps: RequestDeps) {
  return async (input: RequestInput): Promise<HttpReply> => {
    const identity = await deps.identity.resolve(parseBearer(input.authorization));
    if (!identity.ok) return authFailure(identity.error);
    const body = parseRequestBody(input.rawBody);
    if (!body.ok) return reply(HTTP_BAD_REQUEST, body.error);
    return runRequest(deps, identity.value, toGoalMessage(body.value));
  };
}
