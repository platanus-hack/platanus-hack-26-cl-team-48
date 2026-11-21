import { err, type Result } from "@nodomics/protocol";
import type { LlmPort } from "../llm/llm-port.ts";
import type { McpPort, UserIdentity } from "../mcp/mcp-port.ts";

export type LoopLimits = { readonly maxSteps: number; readonly timeoutMs: number };
export const DEFAULT_LIMITS: LoopLimits = { maxSteps: 25, timeoutMs: 300_000 };

export type LoopOutcome = { readonly text: string; readonly steps: number };
export type LoopError = { readonly code: string; readonly message: string };
export type AgentLoopInput = {
  readonly llm: LlmPort;
  readonly mcp: McpPort;
  readonly identity: UserIdentity;
  readonly goal: string;
  readonly allowlist: readonly string[];
  readonly limits?: LoopLimits;
};

export function runAgentLoop(_input: AgentLoopInput): Promise<Result<LoopOutcome, LoopError>> {
  return Promise.resolve(err({ code: "not_implemented", message: "stub" }));
}
