import { ok, type Result } from "@nodomics/protocol";
import { randomUUID } from "node:crypto";
import type { Proposal, ProposalChange } from "../contracts/proposal.ts";
import type { Edge, MemoryError, MemoryPort } from "./memory-port.ts";
import { changeRelation } from "./temporal-graph.ts";

export type DecisionRecord = {
  readonly actorId: string;
  readonly proposal: Proposal;
  readonly acceptedIds: readonly string[];
  readonly at: string;
};

type Outcome = Result<void, MemoryError>;

const VALUE_RELATION = "has_value";

const asValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  return value === undefined ? "null" : JSON.stringify(value);
};

function acceptedParams(record: DecisionRecord): readonly ProposalChange[] {
  return record.proposal.changes.filter(
    (change) => change.kind === "set_param" && record.acceptedIds.includes(change.id),
  );
}

function decisionEpisode(record: DecisionRecord) {
  const { proposal, acceptedIds } = record;
  const rejectedIds = proposal.changes.map((c) => c.id).filter((id) => !acceptedIds.includes(id));
  return {
    id: randomUUID(),
    at: record.at,
    actorId: record.actorId,
    kind: "proposal_decision" as const,
    entityIds: [proposal.flowId, proposal.id, ...acceptedParams(record).map((c) => c.target)],
    payload: { proposalId: proposal.id, acceptedIds, rejectedIds },
  };
}

async function applyEdgeChange(
  memory: MemoryPort,
  change: ProposalChange,
  at: string,
): Promise<Outcome> {
  const current = await memory.edgesAt(change.target, at);
  if (!current.ok) return current;
  const next = changeRelation(current.value, {
    src: change.target,
    relation: VALUE_RELATION,
    newDst: asValue(change.after),
    at,
  });
  return persistChange(memory, current.value, next);
}

async function persistChange(
  memory: MemoryPort,
  before: readonly Edge[],
  after: readonly Edge[],
): Promise<Outcome> {
  const closed = after.filter(
    (edge, index) => index < before.length && edge.validTo !== before[index]?.validTo,
  );
  for (const edge of closed) {
    const result = await memory.closeEdge(edge.id, edge.validTo ?? "");
    if (!result.ok) return result;
  }
  const opened = after[after.length - 1];
  if (!opened) return ok(undefined);
  const result = await memory.openEdge({
    src: opened.src,
    dst: opened.dst,
    relation: opened.relation,
    at: opened.validFrom,
  });
  return result.ok ? ok(undefined) : result;
}

export async function rememberDecision(
  memory: MemoryPort,
  record: DecisionRecord,
): Promise<Outcome> {
  const recorded = await memory.recordEpisode(decisionEpisode(record));
  if (!recorded.ok) return recorded;
  for (const change of acceptedParams(record)) {
    const applied = await applyEdgeChange(memory, change, record.at);
    if (!applied.ok) return applied;
  }
  return ok(undefined);
}
