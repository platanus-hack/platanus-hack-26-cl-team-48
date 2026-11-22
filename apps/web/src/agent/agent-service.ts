import type { Result } from "@nodomics/protocol";

export type AgentErrorCode =
  | "UNAUTHENTICATED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "STALE"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "INVALID";

export type AgentResult<T> = Result<T, { readonly code: AgentErrorCode }>;

export type ProposalCard = {
  readonly changeId: string;
  readonly title: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly unit?: string;
  readonly reason: string;
};

export type AgentProposal = {
  readonly id: string;
  readonly version: number;
  readonly flowId: string;
  readonly cards: readonly ProposalCard[];
};

export type AgentAnswer = { readonly summary: string; readonly proposal?: AgentProposal };

/** What the agent is doing while it works: text it writes, a new step, or a tool it uses. */
export type AgentProgress =
  | { readonly type: "text"; readonly delta: string }
  | { readonly type: "step" }
  | { readonly type: "tool"; readonly name: string };

export type AgentDecision = { readonly acceptedIds: readonly string[]; readonly version: number };

/** The agent service of docs/05-capa-agente.md, as the editor's Agente panel uses it. */
export interface AgentService {
  /** Asks the agent about a saved flow; when it proposes changes, brings the proposal and its version. */
  ask(
    request: { readonly goal: string; readonly flowId: string },
    signal?: AbortSignal,
    onProgress?: (progress: AgentProgress) => void,
  ): Promise<AgentResult<AgentAnswer>>;
  /** Accepts the chosen changes (none rejects them all) and returns the proposal's final status. */
  decide(
    proposalId: string,
    decision: AgentDecision,
  ): Promise<AgentResult<{ readonly status: string }>>;
}
