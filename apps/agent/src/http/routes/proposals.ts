import { parse } from "@nodomics/protocol";
import { Type, type Static } from "@sinclair/typebox";
import type { McpPort } from "../../mcp/mcp-port.ts";
import { decideProposal, type DecisionError } from "../../proposals/decide.ts";
import type { ProposalStorePort } from "../../proposals/proposal-store-port.ts";
import type { Route, RouteReply, RouteRequest } from "../route.ts";

export type ProposalRouteDeps = { readonly store: ProposalStorePort; readonly mcp: McpPort };

const DecisionBody = Type.Object({
  acceptedIds: Type.Array(Type.String()),
  version: Type.Integer({ minimum: 0 }),
});
type DecisionBody = Static<typeof DecisionBody>;

const reply = (status: number, body: unknown): RouteReply => ({ status, body });

function readDecisionBody(rawBody: string): DecisionBody | null {
  try {
    const decoded: unknown = JSON.parse(rawBody);
    const parsed = parse(DecisionBody, decoded);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

function decisionError(error: DecisionError): RouteReply {
  const status =
    error.code === "NOT_FOUND"
      ? 404
      : error.code === "VERSION_CONFLICT" || error.code === "STALE"
        ? 409
        : error.code === "INVALID_CHANGE"
          ? 400
          : error.code === "UPSTREAM_FAILED"
            ? 502
            : 500;
  return reply(status, { error: error.code.toLowerCase() });
}

async function getProposal(deps: ProposalRouteDeps, request: RouteRequest): Promise<RouteReply> {
  const result = await deps.store.get(request.params["id"] ?? "", request.identity.userId);
  if (result.ok) return reply(200, { proposal: result.value.proposal, cards: result.value.cards });
  return reply(result.error.code === "NOT_FOUND" ? 404 : 500, {
    error: result.error.code.toLowerCase(),
  });
}

async function postDecision(deps: ProposalRouteDeps, request: RouteRequest): Promise<RouteReply> {
  const body = readDecisionBody(request.rawBody);
  if (!body) return reply(400, { error: "invalid_body" });
  const result = await decideProposal({
    ...deps,
    identity: request.identity,
    proposalId: request.params["id"] ?? "",
    acceptedIds: body.acceptedIds,
    expectedVersion: body.version,
  });
  return result.ok ? reply(200, result.value) : decisionError(result.error);
}

export function createProposalRoutes(deps: ProposalRouteDeps): Route[] {
  return [
    {
      method: "GET",
      path: "/agent/proposals/:id",
      handle: (request) => getProposal(deps, request),
    },
    {
      method: "POST",
      path: "/agent/proposals/:id/decision",
      handle: (request) => postDecision(deps, request),
    },
  ];
}
