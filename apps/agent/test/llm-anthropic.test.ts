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

const VALID_TOOL_NAME = /^[a-zA-Z0-9_-]{1,128}$/;

const DOTTED_REQUEST: LlmRequest = {
  system: "s",
  messages: [
    { role: "user", text: "make a calculator" },
    {
      role: "assistant",
      turn: {
        kind: "tool_calls",
        calls: [{ id: "t1", name: "flows.add_node", args: { kind: "sum" } }],
      },
    },
    { role: "tool", results: [{ toolCallId: "t1", content: "ok", isError: false }] },
  ],
  tools: [
    { name: "nodes.list", description: "lists", inputSchema: { type: "object" } },
    { name: "flows.add_node", description: "adds", inputSchema: { type: "object" } },
    { name: "search", description: "finds", inputSchema: { type: "object" } },
  ],
};

function sentToolNames(params: CreateParams | undefined): readonly string[] {
  return (params?.tools ?? []).flatMap((tool) => ("name" in tool ? [tool.name] : []));
}

function sentToolUseNames(params: CreateParams | undefined): readonly string[] {
  return (params?.messages ?? []).flatMap((message) =>
    typeof message.content === "string"
      ? []
      : message.content.flatMap((block) => (block.type === "tool_use" ? [block.name] : [])),
  );
}

function respondWithToolUse(name: string) {
  return fakeClient(() => ({
    content: [{ type: "tool_use", id: "t2", name, input: {} }],
  }));
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

  it("omits the tools property when request tools is empty", async () => {
    const { client, seen } = fakeClient(() => ({ content: [{ type: "text", text: "done" }] }));
    const llm = createAnthropicLlm({ apiKey: "k", client });

    await llm.complete({ system: "s", messages: [{ role: "user", text: "hi" }], tools: [] });

    expect(seen[0]?.tools).toBeUndefined();
  });

  it("sends tool names that match the Anthropic name pattern", async () => {
    const { client, seen } = fakeClient(() => ({ content: [{ type: "text", text: "x" }] }));

    await createAnthropicLlm({ apiKey: "k", client }).complete(DOTTED_REQUEST);

    expect(sentToolNames(seen[0]).every((name) => VALID_TOOL_NAME.test(name))).toBe(true);
    expect(sentToolNames(seen[0])).toContain("nodes_list");
  });

  it("maps a translated tool_use name back to the original tool name", async () => {
    const { client } = respondWithToolUse("nodes_list");

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(DOTTED_REQUEST);

    expect(result.ok && result.value.kind === "tool_calls" && result.value.calls[0]?.name).toBe(
      "nodes.list",
    );
  });

  it("sends earlier assistant tool calls with the translated name", async () => {
    const { client, seen } = fakeClient(() => ({ content: [{ type: "text", text: "x" }] }));

    await createAnthropicLlm({ apiKey: "k", client }).complete(DOTTED_REQUEST);

    expect(sentToolUseNames(seen[0])).toEqual(["flows_add_node"]);
  });

  it("keeps an already valid tool name unchanged both ways", async () => {
    const { client, seen } = respondWithToolUse("search");

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(DOTTED_REQUEST);

    expect(sentToolNames(seen[0])).toContain("search");
    expect(result.ok && result.value.kind === "tool_calls" && result.value.calls[0]?.name).toBe(
      "search",
    );
  });

  it("returns an unknown tool_use name unchanged", async () => {
    const { client } = respondWithToolUse("not_a_tool");

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(DOTTED_REQUEST);

    expect(result.ok && result.value.kind === "tool_calls" && result.value.calls[0]?.name).toBe(
      "not_a_tool",
    );
  });
});
