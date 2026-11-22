import type { AgentProgress } from "./agent-service.ts";

export type StreamedReply = { readonly status: number; readonly body: unknown };

const NDJSON = "application/x-ndjson";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isAgentStream = (response: Response): boolean =>
  response.headers.get("content-type")?.includes(NDJSON) === true;

export const AGENT_STREAM_TYPE = NDJSON;

/**
 * Reads the agent's NDJSON reply: reports each progress event and returns the final reply, or
 * undefined when the stream ends without one or a line is not valid JSON.
 */
export async function readAgentStream(
  response: Response,
  onProgress: (progress: AgentProgress) => void,
): Promise<StreamedReply | undefined> {
  if (response.body === null) return undefined;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const state: { pending: string; reply?: StreamedReply; isBroken: boolean } = {
    pending: "",
    isBroken: false,
  };
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const lines = (state.pending + decoder.decode(chunk.value, { stream: true })).split("\n");
    state.pending = lines.pop() ?? "";
    for (const line of lines) readLine(line, state, onProgress);
  }
  readLine(state.pending + decoder.decode(), state, onProgress);
  return state.isBroken ? undefined : state.reply;
}

function readLine(
  line: string,
  state: { reply?: StreamedReply; isBroken: boolean },
  onProgress: (progress: AgentProgress) => void,
): void {
  if (line.trim() === "" || state.isBroken) return;
  const event = parseLine(line);
  if (event === undefined) {
    state.isBroken = true;
    return;
  }
  if (event.type === "done" && typeof event.status === "number")
    state.reply = { status: event.status, body: event.body };
  const progress = progressOf(event);
  if (progress !== undefined) onProgress(progress);
}

function parseLine(line: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function progressOf(event: Record<string, unknown>): AgentProgress | undefined {
  if (event["type"] === "text" && typeof event["delta"] === "string")
    return { type: "text", delta: event["delta"] };
  if (event["type"] === "step") return { type: "step" };
  if (event["type"] === "tool" && typeof event["name"] === "string")
    return { type: "tool", name: event["name"] };
  return undefined;
}
