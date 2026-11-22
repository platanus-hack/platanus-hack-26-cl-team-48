import { describe, expect, it } from "vitest";
import { createMcpClient } from "../src/mcp/mcp-client.ts";
import type { ToolDescriptor, UserIdentity } from "../src/mcp/mcp-port.ts";

const URL_UNDER_TEST = "http://mcp.test/mcp";
const ALICE: UserIdentity = { userId: "alice", accessToken: "token-alice" };
const RETRY_INTERVAL_MS = 2_000;
const DEFAULT_WAKE_TIMEOUT_MS = 60_000;
const HTTP_ACCEPTED = 202;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_UNAUTHORIZED = 401;
const LIST_NODES: ToolDescriptor = {
  name: "nodes.list",
  description: "List",
  inputSchema: { type: "object" },
};

type JsonRpcRequest = {
  readonly id?: string | number;
  readonly method: string;
  readonly params?: { readonly protocolVersion?: string };
};

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function answerRpc(message: JsonRpcRequest): Response {
  if (message.id === undefined) return new Response(null, { status: HTTP_ACCEPTED });
  const result =
    message.method === "initialize"
      ? {
          protocolVersion: message.params?.protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "fake", version: "1.0.0" },
        }
      : { tools: [LIST_NODES] };
  return jsonResponse({ jsonrpc: "2.0", id: message.id, result });
}

const parseRpc = (init: RequestInit | undefined): JsonRpcRequest =>
  JSON.parse(typeof init?.body === "string" ? init.body : "{}") as JsonRpcRequest;

/** A minimal MCP server over fetch that is unreachable for its first `asleepFor` connections. */
function sleepyMcpFetch(asleepFor: number) {
  const state = { attempts: 0 };
  const fetch = (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (init?.method !== "POST") {
      return Promise.resolve(new Response(null, { status: HTTP_METHOD_NOT_ALLOWED }));
    }
    const message = parseRpc(init);
    if (message.method === "initialize") state.attempts += 1;
    if (state.attempts <= asleepFor) return Promise.reject(new TypeError("fetch failed"));
    return Promise.resolve(answerRpc(message));
  };
  return { fetch, state };
}

const unauthorizedFetch = () => {
  const state = { attempts: 0 };
  const fetch = (): Promise<Response> => {
    state.attempts += 1;
    return Promise.resolve(new Response("unauthorized", { status: HTTP_UNAUTHORIZED }));
  };
  return { fetch, state };
};

function fakeClock() {
  const state = { now: 0 };
  const waits: number[] = [];
  return {
    waits,
    now: () => state.now,
    sleep: (ms: number) => {
      waits.push(ms);
      state.now += ms;
      return Promise.resolve();
    },
  };
}

const totalOf = (waits: readonly number[]) => waits.reduce((sum, ms) => sum + ms, 0);

const NEVER_WAKES = Number.POSITIVE_INFINITY;

describe("createMcpClient waiting for a sleeping MCP", () => {
  it("retries listTools every 2 seconds until the MCP answers", async () => {
    const clock = fakeClock();
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: sleepyMcpFetch(3).fetch,
      sleep: clock.sleep,
      now: clock.now,
    });

    const result = await client.listTools(ALICE);

    expect(result).toEqual({ ok: true, value: [LIST_NODES] });
    expect(clock.waits).toEqual([RETRY_INTERVAL_MS, RETRY_INTERVAL_MS, RETRY_INTERVAL_MS]);
  });

  it("does not wait when the MCP answers on the first try", async () => {
    const clock = fakeClock();
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: sleepyMcpFetch(0).fetch,
      sleep: clock.sleep,
      now: clock.now,
    });

    const result = await client.listTools(ALICE);

    expect(result.ok).toBe(true);
    expect(clock.waits).toEqual([]);
  });

  it("returns UNAVAILABLE once the wake timeout has passed", async () => {
    const clock = fakeClock();
    const wakeTimeoutMs = 10_000;
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: sleepyMcpFetch(NEVER_WAKES).fetch,
      sleep: clock.sleep,
      now: clock.now,
      wakeTimeoutMs,
    });

    const result = await client.listTools(ALICE);

    expect(result.ok ? null : result.error.code).toBe("UNAVAILABLE");
    expect(clock.waits.every((ms) => ms === RETRY_INTERVAL_MS)).toBe(true);
    expect(totalOf(clock.waits)).toBeGreaterThanOrEqual(wakeTimeoutMs - RETRY_INTERVAL_MS);
    expect(totalOf(clock.waits)).toBeLessThanOrEqual(wakeTimeoutMs);
  });

  it("waits up to one minute by default", async () => {
    const clock = fakeClock();
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: sleepyMcpFetch(NEVER_WAKES).fetch,
      sleep: clock.sleep,
      now: clock.now,
    });

    const result = await client.listTools(ALICE);

    expect(result.ok ? null : result.error.code).toBe("UNAVAILABLE");
    expect(totalOf(clock.waits)).toBeGreaterThanOrEqual(
      DEFAULT_WAKE_TIMEOUT_MS - RETRY_INTERVAL_MS,
    );
    expect(totalOf(clock.waits)).toBeLessThanOrEqual(DEFAULT_WAKE_TIMEOUT_MS);
  });

  it("does not retry listTools when the MCP rejects the user", async () => {
    const clock = fakeClock();
    const server = unauthorizedFetch();
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: server.fetch,
      sleep: clock.sleep,
      now: clock.now,
    });

    const result = await client.listTools(ALICE);

    expect(result.ok ? null : result.error.code).toBe("UNAUTHORIZED");
    expect(clock.waits).toEqual([]);
  });

  it("does not retry call when the MCP is unavailable", async () => {
    const clock = fakeClock();
    const server = sleepyMcpFetch(1);
    const client = createMcpClient({
      url: URL_UNDER_TEST,
      fetch: server.fetch,
      sleep: clock.sleep,
      now: clock.now,
    });

    const result = await client.call("flows.get", { flowId: "f" }, ALICE);

    expect(result.ok ? null : result.error.code).toBe("UNAVAILABLE");
    expect(clock.waits).toEqual([]);
    expect(server.state.attempts).toBe(1);
  });
});
