import type { ProposalCard } from "./agent-service.ts";

type RequestReply = { readonly summary: string; readonly proposalId?: string };
type ProposalReply = {
  readonly version: number;
  readonly flowId: string;
  readonly cards: readonly ProposalCard[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isOptional = (value: unknown, isType: (value: unknown) => boolean) =>
  value === undefined || isType(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isVersion = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export function parseRequestReply(value: unknown): RequestReply | undefined {
  if (!isRecord(value) || !isString(value["summary"])) return undefined;
  const proposalId = value["proposalId"];
  if (!isOptional(proposalId, isString)) return undefined;
  return isString(proposalId)
    ? { summary: value["summary"], proposalId }
    : { summary: value["summary"] };
}

export function parseProposalReply(value: unknown): ProposalReply | undefined {
  if (!isRecord(value) || !isRecord(value["proposal"]) || !Array.isArray(value["cards"]))
    return undefined;
  const { version, flowId } = value["proposal"];
  const cards = value["cards"].map(parseCard);
  if (!isVersion(version) || !isString(flowId) || !cards.every((card) => card !== undefined))
    return undefined;
  return { version, flowId, cards };
}

export function parseDecisionReply(value: unknown): { readonly status: string } | undefined {
  return isRecord(value) && isString(value["status"]) ? { status: value["status"] } : undefined;
}

export function parseErrorName(value: unknown): string | undefined {
  return isRecord(value) && isString(value["error"]) ? value["error"] : undefined;
}

function parseCard(value: unknown): ProposalCard | undefined {
  if (!isRecord(value)) return undefined;
  const { changeId, title, reason, unit, before, after } = value;
  if (!isString(changeId) || !isString(title) || !isString(reason) || !isOptional(unit, isString))
    return undefined;
  return {
    changeId,
    title,
    reason,
    ...(isString(unit) ? { unit } : {}),
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? {} : { after }),
  };
}
