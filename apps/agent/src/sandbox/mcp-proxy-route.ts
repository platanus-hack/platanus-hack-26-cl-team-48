import type { Route, RouteReply } from "../http/route.ts";
import type { ToolAllowlist } from "../loop/tool-allowlist.ts";
import { parseBearer } from "../requests/identity.ts";
import type { JobTokens } from "./job-tokens.ts";

export type SandboxMcpRouteDeps = {
  readonly tokens: JobTokens;
  readonly mcpUrl: string;
  readonly fetch: typeof fetch;
  readonly allowlist: ToolAllowlist;
};

export type SandboxMcpInput = {
  readonly authorization?: string | undefined;
  readonly rawBody: string;
};

type JsonRpcRequest = {
  readonly jsonrpc?: string | undefined;
  readonly id?: string | number | null | undefined;
  readonly method?: string | undefined;
  readonly params?:
    { readonly name?: string | undefined; readonly arguments?: unknown } | undefined;
};

type JsonRpcTool = { readonly name: string };
type JsonRpcListResult = {
  readonly jsonrpc?: string | undefined;
  readonly id?: string | number | null | undefined;
  readonly result?: { readonly tools?: readonly JsonRpcTool[] | undefined } | undefined;
};

const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_REQUEST = -32600;

function jsonRpcError(
  id: string | number | null | undefined,
  message: string,
  code = JSONRPC_METHOD_NOT_FOUND,
): RouteReply {
  return {
    status: 200,
    body: { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
  };
}

function filterToolsList(body: unknown, allowlist: ToolAllowlist): unknown {
  if (typeof body !== "object" || body === null) return body;
  const list = body as JsonRpcListResult;
  if (!list.result?.tools) return body;
  const tools = list.result.tools.filter((t) => allowlist.includes(t.name));
  return { ...list, result: { ...list.result, tools } };
}

function parseSseData(text: string): unknown {
  const lines = text.split("\n");
  const dataLines = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  const lastData = dataLines[dataLines.length - 1];
  if (!lastData) return { error: "Empty SSE stream" };
  try {
    return JSON.parse(lastData);
  } catch {
    return { error: "Failed to parse SSE data" };
  }
}

function parseResponseBody(text: string, contentType: string): unknown {
  if (contentType.includes("text/event-stream")) {
    return parseSseData(text);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type ForwardOptions = {
  readonly accessToken: string;
  readonly rawBody: string;
  readonly method?: string | undefined;
};

async function forwardMcp(deps: SandboxMcpRouteDeps, opts: ForwardOptions): Promise<RouteReply> {
  const response = await deps.fetch(deps.mcpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: opts.rawBody,
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const parsed = parseResponseBody(text, contentType);
  const body = opts.method === "tools/list" ? filterToolsList(parsed, deps.allowlist) : parsed;
  return { status: response.status, body };
}

type ParsedRpc = {
  readonly isBatch: boolean;
  readonly rpc: JsonRpcRequest | null;
};

function parseJsonRpcBody(rawBody: string): ParsedRpc {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (Array.isArray(parsed)) return { isBatch: true, rpc: null };
    if (typeof parsed === "object" && parsed !== null) {
      return { isBatch: false, rpc: parsed };
    }
    return { isBatch: false, rpc: null };
  } catch {
    return { isBatch: false, rpc: null };
  }
}

export async function handleSandboxMcp(
  deps: SandboxMcpRouteDeps,
  input: SandboxMcpInput,
): Promise<RouteReply> {
  const token = input.authorization ? parseBearer(input.authorization) : null;
  if (!token) return { status: 401, body: { error: "unauthorized" } };
  const job = deps.tokens.resolve(token);
  if (!job) return { status: 401, body: { error: "unauthorized" } };

  const { isBatch, rpc } = parseJsonRpcBody(input.rawBody);
  if (isBatch) {
    return jsonRpcError(null, "Batch requests not supported", JSONRPC_INVALID_REQUEST);
  }
  if (rpc?.method === "tools/call") {
    const toolName = rpc.params?.name;
    if (!toolName || !deps.allowlist.includes(toolName)) {
      return jsonRpcError(rpc.id, `Tool "${toolName ?? ""}" is not allowed in sandbox proxy`);
    }
  }

  return forwardMcp(deps, {
    accessToken: job.accessToken,
    rawBody: input.rawBody,
    method: rpc?.method,
  });
}

export function createSandboxMcpRoute(deps: SandboxMcpRouteDeps): Route {
  return {
    method: "POST",
    path: "/sandbox/mcp",
    handle: (request) => {
      const auth = request.identity.accessToken
        ? `Bearer ${request.identity.accessToken}`
        : undefined;
      return handleSandboxMcp(deps, { authorization: auth, rawBody: request.rawBody });
    },
  };
}
