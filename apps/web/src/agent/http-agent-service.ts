import { err, ok } from "@nodomics/protocol";
import type { AgentAnswer, AgentErrorCode, AgentResult, AgentService } from "./agent-service.ts";
import {
  parseDecisionReply,
  parseErrorName,
  parseProposalReply,
  parseRequestReply,
} from "./parse-agent-reply.ts";

export type HttpAgentDeps = {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string | undefined>;
  readonly fetch: typeof fetch;
};

type Request = {
  readonly path: string;
  readonly body?: unknown;
  readonly signal?: AbortSignal | undefined;
};

const REQUESTS_PATH = "/agent/requests";
const proposalPath = (id: string) => `/agent/proposals/${encodeURIComponent(id)}`;
const CONFLICT = 409;
const CODES_BY_STATUS: Readonly<Record<number, AgentErrorCode>> = {
  400: "INVALID",
  401: "UNAUTHENTICATED",
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
  504: "TIMEOUT",
};

const failure = (code: AgentErrorCode) => err({ code });

/** The agent through its HTTP routes (apps/agent: requests and proposal decisions). */
export function createHttpAgentService(deps: HttpAgentDeps): AgentService {
  const send = createSender(deps);
  return {
    ask: async ({ goal, flowId }, signal) => {
      const reply = await send({ path: REQUESTS_PATH, body: { goal, flowId }, signal });
      if (!reply.ok) return reply;
      const parsed = parseRequestReply(reply.value);
      if (parsed === undefined) return failure("UNAVAILABLE");
      if (parsed.proposalId === undefined) return ok({ summary: parsed.summary });
      return withProposal(parsed.summary, parsed.proposalId, signal);
    },
    decide: async (proposalId, { acceptedIds, version }) => {
      const reply = await send({
        path: `${proposalPath(proposalId)}/decision`,
        body: { acceptedIds, version },
      });
      if (!reply.ok) return reply;
      const parsed = parseDecisionReply(reply.value);
      return parsed === undefined ? failure("UNAVAILABLE") : ok(parsed);
    },
  };

  async function withProposal(
    summary: string,
    id: string,
    signal: AbortSignal | undefined,
  ): Promise<AgentResult<AgentAnswer>> {
    const reply = await send({ path: proposalPath(id), signal });
    if (!reply.ok) return reply;
    const proposal = parseProposalReply(reply.value);
    return proposal === undefined
      ? failure("UNAVAILABLE")
      : ok({ summary, proposal: { id, ...proposal } });
  }
}

/** Sends a request with the user's token and returns the JSON of a successful reply. */
function createSender({ baseUrl, getAccessToken, fetch }: HttpAgentDeps) {
  const root = baseUrl.replace(/\/+$/, "");
  return async ({ path, body, signal }: Request): Promise<AgentResult<unknown>> => {
    const token = await getAccessToken();
    if (token === undefined) return failure("UNAUTHENTICATED");
    try {
      const response = await fetch(`${root}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        ...(signal === undefined ? {} : { signal }),
      });
      const json: unknown = await response.json().catch(() => undefined);
      return response.ok ? ok(json) : failure(codeOf(response.status, json));
    } catch {
      return failure("UNAVAILABLE");
    }
  };
}

function codeOf(status: number, json: unknown): AgentErrorCode {
  if (status === CONFLICT) return parseErrorName(json) === "stale" ? "STALE" : "UNAVAILABLE";
  return CODES_BY_STATUS[status] ?? "UNAVAILABLE";
}
