import type { Result } from "@nodomics/protocol";
import type { McpPort } from "../mcp/mcp-port.ts";
import { rememberDecision, type DecisionRecord } from "./decision-memory.ts";
import type { MemoryError, MemoryPort } from "./memory-port.ts";
import { withMemory, type RecordingMcp } from "./recording-mcp.ts";

export type MemoryDeps = {
  readonly wrapMcp: (mcp: McpPort) => RecordingMcp;
  readonly recordDecision: (
    decision: Omit<DecisionRecord, "at">,
  ) => Promise<Result<void, MemoryError>>;
};

const systemClock = (): string => new Date().toISOString();

export function buildMemoryDeps(memory: MemoryPort, clock: () => string = systemClock): MemoryDeps {
  return {
    wrapMcp: (mcp) => withMemory(mcp, memory, clock),
    recordDecision: (decision) => rememberDecision(memory, { ...decision, at: clock() }),
  };
}
