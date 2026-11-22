import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { err, ok, type Result } from "@nodomics/protocol";
import type { IdentityPort, UserIdentity } from "./identity.ts";
import type { Tools } from "./tools.ts";

type ServerDeps = { readonly tools: Tools; readonly identity: IdentityPort };
const MAX_REQUEST_BYTES = 1_048_576;
export function createMcpServer(deps: ServerDeps): Server {
  return createServer((request, response) => {
    void handleRequest({ deps, request, response });
  });
}
async function handleRequest({
  deps,
  request,
  response,
}: {
  deps: ServerDeps;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  if (request.method !== "POST" || request.url !== "/mcp") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  try {
    const body = await readBody(request);
    if (!body.ok) {
      sendJson(response, 400, { error: body.error });
      return;
    }
    const call = CallToolRequestSchema.safeParse(body.value);
    const identity = call.success
      ? await deps.identity.resolve(request.headers.authorization)
      : undefined;
    if (identity !== undefined && !identity.ok) {
      sendJson(response, identity.error.code === "UNAUTHORIZED" ? 401 : 503, {
        error: identity.error.message,
      });
      return;
    }
    await serveMcp({
      tools: deps.tools,
      request,
      response,
      body: body.value,
      identity: identity?.ok === true ? identity.value : undefined,
    });
  } catch {
    if (!response.headersSent) sendJson(response, 500, { error: "MCP request failed" });
    else response.end();
  }
}
async function serveMcp({
  tools,
  request,
  response,
  body,
  identity,
}: {
  tools: Tools;
  request: IncomingMessage;
  response: ServerResponse;
  body: unknown;
  identity: UserIdentity | undefined;
}): Promise<void> {
  const server = new McpServer(
    { name: "nodomics-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [...tools.list()] }));
  server.server.setRequestHandler(CallToolRequestSchema, async (call) => {
    if (identity === undefined)
      throw new McpError(ErrorCode.InvalidRequest, "Authentication is required");
    return formatToolResult(
      await tools.call(call.params.name, call.params.arguments ?? {}, identity),
    );
  });
  response.on("close", () => {
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(request, response, body);
}
function formatToolResult(result: Awaited<ReturnType<Tools["call"]>>): CallToolResult {
  if (result === "unknown-tool") throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
  if (result === "invalid-args")
    throw new McpError(ErrorCode.InvalidParams, "Invalid tool arguments");
  if (!result.ok) return { isError: true, content: [{ type: "text", text: result.error.message }] };
  return {
    content: [{ type: "text", text: JSON.stringify(result.value) }],
    ...(typeof result.value === "object" && result.value !== null && !Array.isArray(result.value)
      ? { structuredContent: Object.fromEntries(Object.entries(result.value)) }
      : {}),
  };
}
async function readBody(request: IncomingMessage): Promise<Result<unknown, string>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > MAX_REQUEST_BYTES) return err("Request body is too large");
    chunks.push(bytes);
  }
  try {
    // Decoded once: a character split across chunks would otherwise be corrupted.
    return ok(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return err("Invalid JSON");
  }
}
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
