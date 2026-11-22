import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { FetchLike, Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolResultSchema,
  ErrorCode,
  McpError as SdkMcpError,
} from "@modelcontextprotocol/sdk/types.js";
import { err, ok, type Result } from "@nodomics/protocol";
import type { McpError, McpPort, ToolDescriptor, UserIdentity } from "./mcp-port.ts";

export type TransportFactory = (url: string, identity: UserIdentity | null) => Transport;

export type McpClientOptions = {
  readonly url: string;
  readonly transport?: TransportFactory;
  readonly fetch?: FetchLike;
};

const CLIENT_INFO = { name: "nodomics-agent", version: "0.1.0" };
const UNAUTHORIZED_STATUSES: readonly (number | undefined)[] = [401, 403];

const fail = (code: McpError["code"], message: string): Result<never, McpError> =>
  err({ code, message });

function httpTransport(fetchImpl: FetchLike | undefined): TransportFactory {
  return (url, identity) => {
    const headers = identity ? { Authorization: `Bearer ${identity.accessToken}` } : {};
    return new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers },
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
    });
  };
}

function isSchemaViolation(error: unknown): boolean {
  return error instanceof Error && (error.name === "ZodError" || "issues" in error);
}

function mapSdkError(error: SdkMcpError): McpError {
  const codes: Readonly<Record<number, McpError["code"]>> = {
    [ErrorCode.InvalidParams]: "INVALID_ARGS",
    [ErrorCode.MethodNotFound]: "UNKNOWN_TOOL",
    [ErrorCode.ConnectionClosed]: "UNAVAILABLE",
    [ErrorCode.RequestTimeout]: "UNAVAILABLE",
  };
  return { code: codes[error.code] ?? "TOOL_FAILED", message: error.message };
}

function mapError(error: unknown): McpError {
  if (error instanceof SdkMcpError) return mapSdkError(error);
  const message = error instanceof Error ? error.message : "Unknown MCP failure";
  if (error instanceof StreamableHTTPError && UNAUTHORIZED_STATUSES.includes(error.code)) {
    return { code: "UNAUTHORIZED", message };
  }
  if (isSchemaViolation(error)) return { code: "MALFORMED_RESPONSE", message };
  return { code: "UNAVAILABLE", message };
}

async function withClient<T>(
  transport: Transport,
  run: (client: Client) => Promise<Result<T, McpError>>,
): Promise<Result<T, McpError>> {
  const client = new Client(CLIENT_INFO);
  try {
    await client.connect(transport);
    return await run(client);
  } catch (error) {
    return err(mapError(error));
  } finally {
    // Each call owns its connection; a failed close cannot change the outcome already decided.
    await client.close().catch(() => undefined);
  }
}

type ContentItem = { readonly type: string; readonly text?: string };

const textOf = (content: readonly ContentItem[]): string =>
  content.flatMap((item) => (item.type === "text" && item.text ? [item.text] : [])).join("\n");

function readToolResult(result: {
  readonly content: readonly ContentItem[];
  readonly structuredContent?: unknown;
  readonly isError?: boolean | undefined;
}): Result<unknown, McpError> {
  const text = textOf(result.content);
  if (result.isError) return fail("TOOL_FAILED", text || "The tool reported a failure");
  if (result.structuredContent !== undefined) return ok(result.structuredContent);
  try {
    const parsed: unknown = JSON.parse(text);
    return ok(parsed);
  } catch {
    return fail("MALFORMED_RESPONSE", "The tool result is not valid JSON");
  }
}

async function callAndRead(
  client: Client,
  request: { readonly name: string; readonly arguments: Record<string, unknown> },
): Promise<Result<unknown, McpError>> {
  const parsed = CallToolResultSchema.safeParse(await client.callTool(request));
  return parsed.success
    ? readToolResult(parsed.data)
    : fail("MALFORMED_RESPONSE", "The tool result does not match the MCP result schema");
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function createMcpClient(options: McpClientOptions): McpPort {
  const open = options.transport ?? httpTransport(options.fetch);
  return {
    listTools: (identity) =>
      withClient(open(options.url, identity ?? null), async (client) => {
        const { tools } = await client.listTools();
        return ok(
          tools.map((tool): ToolDescriptor => ({
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: tool.inputSchema,
          })),
        );
      }),
    call: (name, args, identity) => {
      if (!isPlainObject(args))
        return Promise.resolve(fail("INVALID_ARGS", "Tool args must be an object"));
      return withClient(open(options.url, identity), async (client) =>
        callAndRead(client, { name, arguments: args }),
      );
    },
  };
}
