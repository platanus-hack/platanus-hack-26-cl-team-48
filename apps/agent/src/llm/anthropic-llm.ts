import Anthropic, { APIError } from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages/messages";
import { err, ok, type Result } from "@nodomics/protocol";
import type { LlmError, LlmMessage, LlmPort, LlmRequest, LlmTurn } from "./llm-port.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_OUTPUT_TOKENS = 4096;

export type CreateParams = MessageCreateParamsNonStreaming;
type ResponseBlock = {
  readonly type: string;
  readonly id?: unknown;
  readonly name?: unknown;
  readonly input?: unknown;
  readonly text?: unknown;
};
export type LlmResponse = { readonly content: readonly ResponseBlock[] };

/** The slice of the SDK client this adapter needs; tests inject a fake. */
export type AnthropicClient = {
  readonly create: (params: CreateParams) => Promise<LlmResponse>;
};

export type AnthropicLlmOptions = {
  readonly apiKey: string;
  readonly model?: string;
  readonly client?: AnthropicClient;
};

export function createAnthropicLlm(options: AnthropicLlmOptions): LlmPort {
  const client = options.client ?? fromSdk(new Anthropic({ apiKey: options.apiKey }));
  const model = options.model ?? DEFAULT_MODEL;
  return {
    complete: async (request) => {
      try {
        return parseResponse(await client.create(toParams(model, request)));
      } catch (error) {
        return err(toLlmError(error));
      }
    },
  };
}

function fromSdk(sdk: Anthropic): AnthropicClient {
  return { create: (params) => sdk.messages.create(params) };
}

function toParams(model: string, request: LlmRequest): CreateParams {
  const tools = request.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: { ...tool.inputSchema, type: "object" as const },
  }));
  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: request.system,
    messages: request.messages.map(toMessageParam),
    ...(tools.length > 0 ? { tools } : {}),
  };
}

function toMessageParam(message: LlmMessage): CreateParams["messages"][number] {
  switch (message.role) {
    case "user":
      return { role: "user", content: message.text };
    case "assistant":
      return { role: "assistant", content: toAssistantContent(message.turn) };
    case "tool":
      return {
        role: "user",
        content: message.results.map((result) => ({
          type: "tool_result" as const,
          tool_use_id: result.toolCallId,
          content: result.content,
          is_error: result.isError,
        })),
      };
  }
}

function toAssistantContent(turn: LlmTurn) {
  return turn.kind === "text"
    ? [{ type: "text" as const, text: turn.text }]
    : turn.calls.map((call) => ({
        type: "tool_use" as const,
        id: call.id,
        name: call.name,
        input: call.args,
      }));
}

function parseResponse(response: LlmResponse): Result<LlmTurn, LlmError> {
  const calls = response.content.flatMap((block) =>
    block.type === "tool_use"
      ? [{ id: String(block.id), name: String(block.name), args: block.input }]
      : [],
  );
  if (calls.length > 0) return ok({ kind: "tool_calls", calls });

  const text = response.content.flatMap((block) =>
    block.type === "text" ? [String(block.text)] : [],
  );
  return text.length > 0
    ? ok({ kind: "text", text: text.join("\n") })
    : err({ code: "MALFORMED_RESPONSE", message: "The model returned no text or tool calls." });
}

// Messages are built from status and type only: SDK error text can echo request headers.
function toLlmError(error: unknown): LlmError {
  if (error instanceof APIError && typeof error.status === "number") {
    return {
      code: "API_ERROR",
      message: `LLM provider rejected the request (status ${String(error.status)}).`,
    };
  }
  return { code: "NETWORK", message: "Could not reach the LLM provider." };
}
