import { err, ok, type Result } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { LlmError, LlmPort, LlmRequest, LlmTurn } from "../src/llm/llm-port.ts";
import { DEFAULT_LIMITS, runAgentLoop } from "../src/loop/agent-loop.ts";
import type { McpError, McpPort, ToolDescriptor, UserIdentity } from "../src/mcp/mcp-port.ts";

const ADD_NODE: ToolDescriptor = {
  name: "add_node",
  description: "adds a node",
  inputSchema: {
    type: "object",
    properties: { kind: { type: "string" } },
    required: ["kind"],
    additionalProperties: false,
  },
};
const DELETE_FLOW: ToolDescriptor = {
  name: "delete_flow",
  description: "deletes a flow",
  inputSchema: { type: "object" },
};
const IDENTITY: UserIdentity = { userId: "u1", accessToken: "token-u1" };
const LIMITS = { maxSteps: 5, timeoutMs: 1000 };

const callTool = (name: string, args: unknown, id = "c1"): LlmTurn => ({
  kind: "tool_calls",
  calls: [{ id, name, args }],
});

function scriptedLlm(turns: readonly LlmTurn[]) {
  const requests: LlmRequest[] = [];
  const llm: LlmPort = {
    complete: (request) => {
      requests.push(request);
      const turn = turns[Math.min(requests.length, turns.length) - 1];
      const result: Result<LlmTurn, LlmError> = turn
        ? ok(turn)
        : err({ code: "API_ERROR", message: "script exhausted" });
      return Promise.resolve(result);
    },
  };
  return { llm, requests };
}

type Call = { name: string; args: unknown; identity: UserIdentity };

function fakeMcp(reply: Result<unknown, McpError> = ok({ done: true })) {
  const calls: Call[] = [];
  const mcp: McpPort = {
    listTools: () => Promise.resolve(ok([ADD_NODE, DELETE_FLOW])),
    call: (name, args, identity) => {
      calls.push({ name, args, identity });
      return Promise.resolve(reply);
    },
  };
  return { mcp, calls };
}

const run = (
  llm: LlmPort,
  mcp: McpPort,
  overrides: { allowlist?: string[]; limits?: typeof LIMITS } = {},
) =>
  runAgentLoop({
    llm,
    mcp,
    identity: IDENTITY,
    goal: "make a harvest calculator",
    allowlist: overrides.allowlist ?? ["add_node"],
    limits: overrides.limits ?? LIMITS,
  });

describe("runAgentLoop", () => {
  it("returns the final text once the llm stops calling tools", async () => {
    const { llm } = scriptedLlm([
      callTool("add_node", { kind: "sum" }),
      { kind: "text", text: "ready" },
    ]);
    const { mcp, calls } = fakeMcp();

    const result = await run(llm, mcp);

    expect(result).toEqual({ ok: true, value: { text: "ready", steps: 2 } });
    expect(calls).toHaveLength(1);
  });

  it("has default limits of 25 steps and 5 minutes", () => {
    expect(DEFAULT_LIMITS).toEqual({ maxSteps: 25, timeoutMs: 300_000 });
  });

  it('stops after maxSteps with LoopError "max_steps"', async () => {
    const { llm, requests } = scriptedLlm([callTool("add_node", { kind: "sum" })]);

    const result = await run(llm, fakeMcp().mcp, { limits: { maxSteps: 3, timeoutMs: 1000 } });

    expect(!result.ok && result.error.code).toBe("max_steps");
    expect(requests).toHaveLength(3);
  });

  it('stops on timeout with LoopError "timeout"', async () => {
    const llm: LlmPort = { complete: () => new Promise(() => undefined) };

    const result = await run(llm, fakeMcp().mcp, { limits: { maxSteps: 5, timeoutMs: 20 } });

    expect(!result.ok && result.error.code).toBe("timeout");
  });

  it("feeds tool error back to llm as is_error tool_result", async () => {
    const { llm, requests } = scriptedLlm([
      callTool("add_node", { kind: "sum" }),
      { kind: "text", text: "gave up" },
    ]);
    const { mcp } = fakeMcp(err({ code: "TOOL_FAILED", message: "node kind not found" }));

    const result = await run(llm, mcp);

    expect(result.ok).toBe(true);
    const last = requests[1]?.messages.at(-1);
    const toolResult = last?.role === "tool" ? last.results[0] : undefined;
    expect(toolResult?.toolCallId).toBe("c1");
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.content).toContain("node kind not found");
  });

  it("rejects tool call whose args fail schema", async () => {
    const { llm, requests } = scriptedLlm([
      callTool("add_node", { kind: 5 }),
      { kind: "text", text: "ok" },
    ]);
    const { mcp, calls } = fakeMcp();

    await run(llm, mcp);

    expect(calls).toHaveLength(0);
    const last = requests[1]?.messages.at(-1);
    expect(last?.role === "tool" && last.results[0]?.isError).toBe(true);
  });

  it("tool allowlist is enforced outside the prompt", async () => {
    const { llm, requests } = scriptedLlm([
      callTool("delete_flow", {}),
      { kind: "text", text: "ok" },
    ]);
    const { mcp, calls } = fakeMcp();

    await run(llm, mcp, { allowlist: ["add_node"] });

    expect(calls).toHaveLength(0);
    expect(requests[0]?.tools.map((tool) => tool.name)).toEqual(["add_node"]);
    const last = requests[1]?.messages.at(-1);
    expect(last?.role === "tool" && last.results[0]).toMatchObject({ isError: true });
  });

  it("passes user identity to every mcp call", async () => {
    const { llm } = scriptedLlm([
      callTool("add_node", { kind: "sum" }, "c1"),
      callTool("add_node", { kind: "avg" }, "c2"),
      { kind: "text", text: "ok" },
    ]);
    const { mcp, calls } = fakeMcp();

    await run(llm, mcp);

    expect(calls.map((call) => call.identity)).toEqual([IDENTITY, IDENTITY]);
  });

  it("returns llm_failed when the llm errors", async () => {
    const { llm } = scriptedLlm([]);

    const result = await run(llm, fakeMcp().mcp);

    expect(!result.ok && result.error.code).toBe("llm_failed");
  });
});
