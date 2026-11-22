import { APIError } from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  createAnthropicLlm,
  type AnthropicClient,
  type CreateParams,
  type LlmResponse,
} from "../src/llm/anthropic-llm.ts";
import type { LlmRequest } from "../src/llm/llm-port.ts";

const REQUEST: LlmRequest = {
  system: "be useful",
  messages: [{ role: "user", text: "make a calculator" }],
  tools: [{ name: "nodes.list", description: "lists", inputSchema: { type: "object" } }],
};

type Script = {
  readonly deltas?: readonly string[];
  readonly respond: () => LlmResponse;
};

function fakeClient(script: Script) {
  const created: CreateParams[] = [];
  const streamed: CreateParams[] = [];
  const client: AnthropicClient = {
    create: (params) => {
      created.push(params);
      return Promise.resolve(script.respond());
    },
    stream: (params, onText) => {
      streamed.push(params);
      for (const delta of script.deltas ?? []) onText(delta);
      return Promise.resolve(script.respond());
    },
  };
  return { client, created, streamed };
}

const textResponse = (text: string) => (): LlmResponse => ({ content: [{ type: "text", text }] });

const streamingRequest = (deltas: string[]): LlmRequest => ({
  ...REQUEST,
  onTextDelta: (delta) => deltas.push(delta),
});

describe("createAnthropicLlm streaming", () => {
  it("streams when the request asks for text deltas", async () => {
    const { client, created, streamed } = fakeClient({ respond: textResponse("done") });

    await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest([]));

    expect(streamed).toHaveLength(1);
    expect(created).toHaveLength(0);
  });

  it("forwards every text delta in order", async () => {
    const deltas: string[] = [];
    const { client } = fakeClient({
      deltas: ["Hola", ", voy a ", "agregar un nodo"],
      respond: textResponse("Hola, voy a agregar un nodo"),
    });

    await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest(deltas));

    expect(deltas).toEqual(["Hola", ", voy a ", "agregar un nodo"]);
  });

  it("returns the same final text turn when streaming", async () => {
    const { client } = fakeClient({ deltas: ["do", "ne"], respond: textResponse("done") });

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest([]));

    expect(result).toEqual({ ok: true, value: { kind: "text", text: "done" } });
  });

  it("uses create when the request does not ask for text deltas", async () => {
    const { client, created, streamed } = fakeClient({ respond: textResponse("done") });

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(REQUEST);

    expect(created).toHaveLength(1);
    expect(streamed).toHaveLength(0);
    expect(result).toEqual({ ok: true, value: { kind: "text", text: "done" } });
  });

  it("sends the same params when streaming as when creating", async () => {
    const plain = fakeClient({ respond: textResponse("x") });
    const live = fakeClient({ respond: textResponse("x") });

    await createAnthropicLlm({ apiKey: "k", client: plain.client }).complete(REQUEST);
    await createAnthropicLlm({ apiKey: "k", client: live.client }).complete(streamingRequest([]));

    expect(live.streamed[0]).toEqual(plain.created[0]);
  });

  it("maps a streamed tool_use name back to the original tool name", async () => {
    const { client, streamed } = fakeClient({
      respond: () => ({ content: [{ type: "tool_use", id: "t1", name: "nodes_list", input: {} }] }),
    });

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest([]));

    expect(streamed[0]?.tools).toEqual([
      { name: "nodes_list", description: "lists", input_schema: { type: "object" } },
    ]);
    expect(result).toEqual({
      ok: true,
      value: { kind: "tool_calls", calls: [{ id: "t1", name: "nodes.list", args: {} }] },
    });
  });

  it("turns a streaming API error into LlmError without leaking the key", async () => {
    const { client } = fakeClient({
      respond: () => {
        throw APIError.generate(
          401,
          { error: { message: "bad key sk-secret" } },
          "bad key",
          new Headers(),
        );
      },
    });

    const result = await createAnthropicLlm({ apiKey: "sk-secret", client }).complete(
      streamingRequest([]),
    );

    expect(!result.ok && result.error.code).toBe("API_ERROR");
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });

  it("turns a streaming network failure into LlmError", async () => {
    const { client } = fakeClient({
      respond: () => {
        throw new TypeError("fetch failed");
      },
    });

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest([]));

    expect(!result.ok && result.error.code).toBe("NETWORK");
  });

  it("rejects a streamed response with no usable content", async () => {
    const { client } = fakeClient({ respond: () => ({ content: [] }) });

    const result = await createAnthropicLlm({ apiKey: "k", client }).complete(streamingRequest([]));

    expect(!result.ok && result.error.code).toBe("MALFORMED_RESPONSE");
  });
});
