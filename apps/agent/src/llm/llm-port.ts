import type { Result } from "@nodomics/protocol";
import type { ToolDescriptor } from "../mcp/mcp-port.ts";

export type ToolCall = {
  readonly id: string;
  readonly name: string;
  readonly args: unknown;
};

export type ToolResult = {
  readonly toolCallId: string;
  readonly content: string;
  readonly isError: boolean;
};

export type LlmTurn =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "tool_calls"; readonly calls: readonly ToolCall[] };

export type LlmMessage =
  | { readonly role: "user"; readonly text: string }
  | { readonly role: "assistant"; readonly turn: LlmTurn }
  | { readonly role: "tool"; readonly results: readonly ToolResult[] };

export type LlmRequest = {
  readonly system: string;
  readonly messages: readonly LlmMessage[];
  readonly tools: readonly ToolDescriptor[];
};

export type LlmErrorCode = "API_ERROR" | "NETWORK" | "MALFORMED_RESPONSE";

export type LlmError = {
  readonly code: LlmErrorCode;
  readonly message: string;
};

export type LlmPort = {
  readonly complete: (request: LlmRequest) => Promise<Result<LlmTurn, LlmError>>;
};
