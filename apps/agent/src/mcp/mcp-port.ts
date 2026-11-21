import type { Result } from "@nodomics/protocol";

export type UserIdentity = {
  readonly userId: string;
  readonly accessToken: string;
};

export type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
};

export type McpErrorCode =
  | "UNKNOWN_TOOL"
  | "INVALID_ARGS"
  | "TOOL_FAILED"
  | "MALFORMED_RESPONSE"
  | "UNAUTHORIZED"
  | "UNAVAILABLE";

export type McpError = {
  readonly code: McpErrorCode;
  readonly message: string;
};

export type McpPort = {
  readonly listTools: (
    identity?: UserIdentity,
  ) => Promise<Result<readonly ToolDescriptor[], McpError>>;
  readonly call: (
    name: string,
    args: unknown,
    identity: UserIdentity,
  ) => Promise<Result<unknown, McpError>>;
};
