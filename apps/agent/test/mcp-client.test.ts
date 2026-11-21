import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { expect, it } from "vitest";
import { createMcpClient } from "../src/mcp/mcp-client.ts";
import type { UserIdentity } from "../src/mcp/mcp-port.ts";

const ALICE: UserIdentity = { userId: "alice", accessToken: "token-alice" };
const BOB: UserIdentity = { userId: "bob", accessToken: "token-bob" };
const URL_UNDER_TEST = "http://mcp.test/mcp";

type Handler = (method: string, params: unknown) => unknown;

function isRequest(message: JSONRPCMessage): message is JSONRPCMessage & {
  readonly id: string | number;
  readonly method: string;
  readonly params?: unknown;
} {
  return "method" in message && "id" in message;
}

function fakeTransport(handler: Handler): Transport {
  const transport: Transport = {
    start: () => Promise.resolve(),
    close: () => Promise.resolve(),
    send: (message) => {
      if (!isRequest(message)) return Promise.resolve();
      const result = message.method === "initialize" ? initializeResult(message.params) : handler(message.method, message.params);
      queueMicrotask(() => transport.onmessage?.({ jsonrpc: "2.0", id: message.id, result: result as Record<string, unknown> }));
      return Promise.resolve();
    },
  };
  return transport;
}

function initializeResult(params: unknown): Record<string, unknown> {
  const requested = (params as { protocolVersion: string }).protocolVersion;
  return {
    protocolVersion: requested,
    capabilities: { tools: {} },
    serverInfo: { name: "fake", version: "1.0.0" },
  };
}

const textResult = (value: unknown): unknown => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

it("forwards user identity on every call", async () => {
  const seen: (UserIdentity | null)[] = [];
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    transport: (_url, identity) => {
      seen.push(identity);
      return fakeTransport(() => textResult({ done: true }));
    },
  });

  const first = await client.call("flows.get", { flowId: "f" }, ALICE);
  const second = await client.call("flows.get", { flowId: "f" }, BOB);

  expect(first).toEqual({ ok: true, value: { done: true } });
  expect(second).toEqual({ ok: true, value: { done: true } });
  expect(seen).toEqual([ALICE, BOB]);
});

it("default transport sends the bearer token and maps a network failure to UNAVAILABLE", async () => {
  const headers: string[] = [];
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    fetch: (_input, init) => {
      headers.push(new Headers(init?.headers).get("authorization") ?? "");
      return Promise.reject(new TypeError("fetch failed"));
    },
  });

  const result = await client.call("flows.get", {}, ALICE);

  expect(headers).toContain("Bearer token-alice");
  expect(result).toEqual({ ok: false, error: { code: "UNAVAILABLE", message: expect.any(String) as string } });
});

it("maps malformed mcp response to McpError", async () => {
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    transport: () => fakeTransport(() => ({ content: "not a list" })),
  });

  const result = await client.call("flows.get", {}, ALICE);

  expect(result.ok ? null : result.error.code).toBe("MALFORMED_RESPONSE");
});

it("maps a tool result that is not json to MALFORMED_RESPONSE", async () => {
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    transport: () => fakeTransport(() => ({ content: [{ type: "text", text: "plain words" }] })),
  });

  const result = await client.call("flows.get", {}, ALICE);

  expect(result.ok ? null : result.error.code).toBe("MALFORMED_RESPONSE");
});

it("maps an isError tool result to TOOL_FAILED with its message", async () => {
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    transport: () => fakeTransport(() => ({ isError: true, content: [{ type: "text", text: "Node does not exist" }] })),
  });

  const result = await client.call("flows.connect", {}, ALICE);

  expect(result).toEqual({ ok: false, error: { code: "TOOL_FAILED", message: "Node does not exist" } });
});

it("prefers structured content over text", async () => {
  const client = createMcpClient({
    url: URL_UNDER_TEST,
    transport: () => fakeTransport(() => ({ content: [], structuredContent: { rows: 3 } })),
  });

  const result = await client.call("run.sample", {}, ALICE);

  expect(result).toEqual({ ok: true, value: { rows: 3 } });
});

it("lists tools as descriptors and rejects a tool without inputSchema", async () => {
  const good = { name: "nodes.list", description: "List", inputSchema: { type: "object" } };
  const listing = (tools: unknown[]) => createMcpClient({ url: URL_UNDER_TEST, transport: () => fakeTransport(() => ({ tools })) });

  const ok = await listing([good]).listTools();
  const bad = await listing([{ name: "broken" }]).listTools();

  expect(ok).toEqual({ ok: true, value: [good] });
  expect(bad.ok ? null : bad.error.code).toBe("MALFORMED_RESPONSE");
});

it("rejects non-object args before reaching the network", async () => {
  const client = createMcpClient({ url: URL_UNDER_TEST, transport: () => fakeTransport(() => ({})) });

  const result = await client.call("flows.get", "oops", ALICE);

  expect(result.ok ? null : result.error.code).toBe("INVALID_ARGS");
});
