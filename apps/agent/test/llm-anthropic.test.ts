import { APIError } from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  createAnthropicLlm,
  DEFAULT_MODEL,
  type CreateParams,
  type LlmResponse,
} from "../src/llm/anthropic-llm.ts";
import type { LlmRequest } from "../src/llm/llm-port.ts";

const REQUEST: LlmRequest = {
  system: "be useful",
  messages: [
    { role: "user", text: "make a calculator" },
    {
      role: "assistant",
      turn: { kind: "tool_calls", calls: [{ id: "t1", name: "add_node", args: { kind: "sum" } }] },
    },
    { role: "tool", results: [{ toolCallId: "t1", content: "boom", isError: true }] },
  ],
  tools: [{ name: "add_node", description: "adds", inputSchema: { type: "object" } }],
};

function fakeClient(respond: (params: CreateParams) => LlmResponse) {
  const seen: CreateParams[] = [];
  const client = {
    create: (params: CreateParams) => {
      seen.push(params);
      return Promise.resolve(respond(params));
    },
  };
  return { client, seen };
}

describe("createAnthropicLlm", () => {
  it("maps tool_use blocks to tool calls", async () => {
    const { client } = fakeClient(() => ({
      content: [{ type: "tool_use", id: "t2", name: "add_node", input: { kind: "avg" } }],
    }));
    const llm = createAnthropicLlm({ apiKey: "k", client });

    expect(await llm.complete(REQUEST)).toEqual({
      ok: true,
      value: { kind: "tool_calls", calls: [{ id: "t2", name: "add_node", args: { kind: "avg" } }] },
    });
  });

  it("maps text blocks to a final text turn", async () => {
    const { client } = fakeClient(() => ({ content: [{ type: "text", text: "done" }] }));
    const llm = createAnthropicLlm({ apiKey: "k", client });

    expect(await llm.complete(REQUEST)).toEqual({
      ok: true,
      value: { kind: "text", text: "done" },
    });
  });

  it("sends default model, system, tools and is_error tool results", async () => {
    const { client, seen } = fakeClient(() => ({ content: [{ type: "text", text: "x" }] }));
    await createAnthropicLlm({ apiKey: "k", client }).complete(REQUEST);

    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    expect(seen[0]?.model).toBe(DEFAULT_MODEL);
    expect(seen[0]?.system).toBe("be useful");
    expect(seen[0]?.tools).toEqual([
      { name: "add_node", description: "adds", input_schema: { type: "object" } },
    ]);
    expect(seen[0]?.messages[2]).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: "boom", is_error: true }],
    });
  });

  it("turns an API error into LlmError without leaking the key", async () => {
    const { client } = fakeClient(() => {
      throw APIError.generate(
        401,
        { error: { message: "bad key sk-secret" } },
        "bad key",
        new Headers(),
      );
    });
    const result = await createAnthropicLlm({ apiKey: "sk-secret", client }).complete(REQUEST);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("API_ERROR");
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });

  it("turns a network failure into LlmError", async () => {
    const { client } = fakeClient(() => {
      throw new TypeError("fetch failed");
    });
    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(REQUEST);

    expect(!result.ok && result.error.code).toBe("NETWORK");
  });

  it("rejects a response with no usable content", async () => {
    const { client } = fakeClient(() => ({ content: [] }));
    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(REQUEST);

    expect(!result.ok && result.error.code).toBe("MALFORMED_RESPONSE");
  });
});
