import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LlmError, LlmPort, LlmRequest, LlmTurn } from "../src/llm/llm-port.ts";
import { runAgentLoop, type AgentEvent } from "../src/loop/agent-loop.ts";
import type { McpPort, ToolDescriptor, UserIdentity } from "../src/mcp/mcp-port.ts";

const tool = (name: string): ToolDescriptor => ({
  name,
  description: name,
  inputSchema: { type: "object" },
});
const IDENTITY: UserIdentity = { userId: "u1", accessToken: "token-u1" };
const LIMITS = { maxSteps: 5, timeoutMs: 1000 };
const ALLOWLIST = ["flows.get", "flows.add_node"];

type ScriptedTurn = { readonly deltas: readonly string[]; readonly turn: LlmTurn };

/** Speaks each turn's deltas through onTextDelta (when asked) before answering the turn. */
function streamingLlm(script: readonly ScriptedTurn[]) {
  const requests: LlmRequest[] = [];
  const llm: LlmPort = {
    complete: (request) => {
      requests.push(request);
      const step = script[requests.length - 1];
      for (const delta of step?.deltas ?? []) request.onTextDelta?.(delta);
      const result: Result<LlmTurn, LlmError> = step
        ? ok(step.turn)
        : err({ code: "API_ERROR", message: "script exhausted" });
      return Promise.resolve(result);
    },
  };
  return { llm, requests };
}

const mcp: McpPort = {
  listTools: () => Promise.resolve(ok(ALLOWLIST.map(tool))),
  call: () => Promise.resolve(ok({ done: true })),
};

const callTools = (...names: string[]): LlmTurn => ({
  kind: "tool_calls",
  calls: names.map((name, index) => ({ id: `c${String(index)}`, name, args: {} })),
});

const run = (llm: LlmPort, onEvent?: (event: AgentEvent) => void) =>
  runAgentLoop({
    llm,
    mcp,
    identity: IDENTITY,
    goal: "make a harvest calculator",
    allowlist: ALLOWLIST,
    limits: LIMITS,
    ...(onEvent ? { onEvent } : {}),
  });

const TWO_STEP_SCRIPT: readonly ScriptedTurn[] = [
  { deltas: ["Voy a ", "mirar el flujo"], turn: callTools("flows.get") },
  { deltas: ["Listo"], turn: { kind: "text", text: "Listo" } },
];

describe("runAgentLoop events", () => {
  it("emits text, tool and step events in the order they happen", async () => {
    const { llm } = streamingLlm(TWO_STEP_SCRIPT);
    const events: AgentEvent[] = [];

    await run(llm, (event) => events.push(event));

    expect(events).toEqual([
      { type: "text", delta: "Voy a " },
      { type: "text", delta: "mirar el flujo" },
      { type: "tool", name: "flows.get" },
      { type: "step" },
      { type: "text", delta: "Listo" },
    ]);
  });

  it("emits one tool event per call in a turn", async () => {
    const { llm } = streamingLlm([
      { deltas: [], turn: callTools("flows.get", "flows.add_node") },
      { deltas: [], turn: { kind: "text", text: "ok" } },
    ]);
    const events: AgentEvent[] = [];

    await run(llm, (event) => events.push(event));

    expect(events).toEqual([
      { type: "tool", name: "flows.get" },
      { type: "tool", name: "flows.add_node" },
      { type: "step" },
    ]);
  });

  it("does not emit a step before the first model call", async () => {
    const { llm } = streamingLlm([{ deltas: ["Hola"], turn: { kind: "text", text: "Hola" } }]);
    const events: AgentEvent[] = [];

    await run(llm, (event) => events.push(event));

    expect(events).toEqual([{ type: "text", delta: "Hola" }]);
  });

  it("returns the same outcome with and without events", async () => {
    const withEvents = await run(streamingLlm(TWO_STEP_SCRIPT).llm, () => undefined);

    const withoutEvents = await run(streamingLlm(TWO_STEP_SCRIPT).llm);

    expect(withEvents).toEqual({ ok: true, value: { text: "Listo", steps: 2 } });
    expect(withoutEvents).toEqual(withEvents);
  });

  it("asks every model call for text deltas when events are wanted", async () => {
    const { llm, requests } = streamingLlm(TWO_STEP_SCRIPT);

    await run(llm, () => undefined);

    expect(requests.map((request) => typeof request.onTextDelta)).toEqual(["function", "function"]);
  });

  it("does not ask for text deltas when no one listens for events", async () => {
    const { llm, requests } = streamingLlm(TWO_STEP_SCRIPT);

    await run(llm);

    expect(requests.map((request) => request.onTextDelta)).toEqual([undefined, undefined]);
  });
});
