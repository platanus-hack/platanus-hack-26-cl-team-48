import { randomUUID } from "node:crypto";
import type { Result } from "@nodomics/protocol";
import type { Episode, MemoryError, MemoryPort } from "./memory-port.ts";
import { redactSecrets } from "./episodes-redact.ts";

export type McpCallRecord = {
  readonly actorId: string;
  readonly tool: string;
  readonly args: unknown;
  readonly result: unknown;
  readonly at: string;
};

const ENTITY_ARG_KEYS = ["flowId", "nodeId", "draftId"] as const;

function entityIdsOf(args: unknown): readonly string[] {
  if (typeof args !== "object" || args === null) return [];
  const record: Readonly<Record<string, unknown>> = Object.fromEntries(Object.entries(args));
  return ENTITY_ARG_KEYS.flatMap((key) => {
    const id = record[key];
    return typeof id === "string" ? [id] : [];
  });
}

function toEpisode(call: McpCallRecord): Episode {
  return {
    id: randomUUID(),
    at: call.at,
    actorId: call.actorId,
    kind: "mcp_call",
    entityIds: entityIdsOf(call.args),
    payload: {
      tool: call.tool,
      args: redactSecrets(call.args),
      result: redactSecrets(call.result),
    },
  };
}

export function recordMcpCall(
  memory: MemoryPort,
  call: McpCallRecord,
): Promise<Result<void, MemoryError>> {
  return memory.recordEpisode(toEpisode(call));
}
