import type { Result } from "@nodomics/protocol";
import type { McpError, McpPort, UserIdentity } from "../mcp/mcp-port.ts";
import { recordMcpCall } from "./episodes.ts";
import type { MemoryPort } from "./memory-port.ts";

export type RecordingMcp = McpPort & { readonly droppedEpisodes: () => number };

type Outcome = Result<unknown, McpError>;

function describeValue(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return { kind: "array", size: value.length };
  if (typeof value === "object" && value !== null)
    return { kind: "object", keys: Object.keys(value).slice(0, 10) };
  return { kind: typeof value };
}

function summarize(outcome: Outcome): Record<string, unknown> {
  if (outcome.ok) return { ok: true, ...describeValue(outcome.value) };
  return { ok: false, code: outcome.error.code, message: outcome.error.message.slice(0, 200) };
}

async function recordSafely(
  memory: MemoryPort,
  call: Parameters<typeof recordMcpCall>[1],
): Promise<boolean> {
  try {
    return (await recordMcpCall(memory, call)).ok;
  } catch {
    return false;
  }
}

export function withMemory(mcp: McpPort, memory: MemoryPort, clock: () => string): RecordingMcp {
  const dropped = { count: 0 };
  const call = async (name: string, args: unknown, identity: UserIdentity): Promise<Outcome> => {
    const outcome = await mcp.call(name, args, identity);
    const stored = await recordSafely(memory, {
      actorId: identity.userId,
      tool: name,
      args,
      result: summarize(outcome),
      at: clock(),
    });
    if (!stored) dropped.count += 1;
    return outcome;
  };
  return { listTools: () => mcp.listTools(), call, droppedEpisodes: () => dropped.count };
}
