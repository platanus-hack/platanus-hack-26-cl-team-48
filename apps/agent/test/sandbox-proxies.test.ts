import { describe, expect, it } from "vitest";
import { createJobTokens, DEFAULT_JOB_TOKEN_TTL_MS } from "../src/sandbox/job-tokens.ts";
import { handleSandboxMcp } from "../src/sandbox/mcp-proxy-route.ts";
import { PROXY_ALLOWLIST } from "../src/sandbox/proxy-allowlist.ts";

describe("job-tokens (H1)", () => {
  it("token desconocido, vencido o revocado → null", () => {
    let now = 1_000_000;
    const tokens = createJobTokens({ clock: () => now, ttlMs: 1_000 });

    expect(tokens.resolve("non-existent-token")).toBeNull();

    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "secret-jwt-1",
    });

    expect(tokens.resolve(issued.token)).toEqual({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "secret-jwt-1",
    });

    // Advance time past TTL
    now += 1_001;
    expect(tokens.resolve(issued.token)).toBeNull();

    // Re-issue and revoke
    const issued2 = tokens.issue({
      jobId: "job-2",
      userId: "user-2",
      accessToken: "secret-jwt-2",
    });
    tokens.revoke("job-2");
    expect(tokens.resolve(issued2.token)).toBeNull();
  });

  it("dos trabajos no comparten token", () => {
    const tokens = createJobTokens();
    const token1 = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "jwt-1",
    });
    const token2 = tokens.issue({
      jobId: "job-2",
      userId: "user-2",
      accessToken: "jwt-2",
    });

    expect(token1.token).not.toBe(token2.token);
    expect(tokens.resolve(token1.token)?.jobId).toBe("job-1");
    expect(tokens.resolve(token2.token)?.jobId).toBe("job-2");
  });

  it("el accessToken nunca sale en String(token) ni en JSON.stringify de lo que devuelve issue", () => {
    const secretJwt = "super-confidential-user-jwt";
    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: secretJwt,
    });

    expect(issued.token).not.toContain(secretJwt);
    expect(JSON.stringify(issued)).not.toContain(secretJwt);
    expect(DEFAULT_JOB_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
  });
});

describe("mcp-proxy-route (H2 & C1-C3)", () => {
  it("token inválido → 401 sin llamar al MCP", async () => {
    let fetchCalled = false;
    const fakeFetch: typeof fetch = () => {
      fetchCalled = true;
      return Promise.resolve(new Response(JSON.stringify({})));
    };

    const tokens = createJobTokens();
    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: "Bearer invalid-token",
      rawBody: JSON.stringify({ method: "tools/list" }),
    });
    expect(reply.status).toBe(401);
    expect(fetchCalled).toBe(false);
  });

  it("flows.apply → error JSON-RPC sin llamar al MCP", async () => {
    let fetchCalled = false;
    const fakeFetch: typeof fetch = () => {
      fetchCalled = true;
      return Promise.resolve(new Response(JSON.stringify({})));
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "user-jwt-123",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-1",
        method: "tools/call",
        params: { name: "flows.apply", arguments: { draftId: "d1" } },
      }),
    });

    expect(fetchCalled).toBe(false);
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({
      jsonrpc: "2.0",
      id: "req-1",
      error: { code: -32601, message: 'Tool "flows.apply" is not allowed in sandbox proxy' },
    });
  });

  it("batch con flows.apply → no llama al MCP", async () => {
    let fetchCalled = false;
    const fakeFetch: typeof fetch = () => {
      fetchCalled = true;
      return Promise.resolve(new Response(JSON.stringify({})));
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "user-jwt-123",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify([
        {
          jsonrpc: "2.0",
          id: "batch-1",
          method: "tools/call",
          params: { name: "flows.apply", arguments: {} },
        },
      ]),
    });

    expect(fetchCalled).toBe(false);
    expect(reply.status).toBe(200);
    const body = reply.body as { jsonrpc?: string; error?: { code?: number } };
    expect(body.jsonrpc).toBe("2.0");
    expect(typeof body.error?.code).toBe("number");
  });

  it("reenvía con el JWT del dueño del trabajo y nunca con el token de trabajo", async () => {
    let capturedAuth: string | null = null;
    let capturedBody: string | null = null;
    const fakeFetch: typeof fetch = (_url, init) => {
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("Authorization");
      capturedBody = typeof init?.body === "string" ? init.body : null;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "req-2",
            result: { content: [{ type: "text", text: "ok" }] },
          }),
        ),
      );
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "owner-user-id",
      accessToken: "real-owner-jwt-xyz",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-2",
        method: "tools/call",
        params: { name: "nodes.list", arguments: {} },
      }),
    });

    expect(reply.status).toBe(200);
    expect(capturedAuth).toBe("Bearer real-owner-jwt-xyz");
    expect(capturedAuth).not.toContain(issued.token);
    expect(capturedBody).not.toContain(issued.token);
  });

  it("reenvía Accept con text/event-stream", async () => {
    let capturedAccept: string | null = null;
    const fakeFetch: typeof fetch = (_url, init) => {
      const headers = new Headers(init?.headers);
      capturedAccept = headers.get("Accept");
      return Promise.resolve(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "req-accept",
            result: {},
          }),
        ),
      );
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "jwt-1",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify({
        jsonrpc: "2.0",
        id: "req-accept",
        method: "tools/list",
      }),
    });

    expect(capturedAccept).toContain("text/event-stream");
    expect(capturedAccept).toContain("application/json");
  });

  it("MCP que responde en SSE → el proxy devuelve el JSON y filtra tools/list", async () => {
    const ssePayload = [
      "event: message",
      `data: ${JSON.stringify({
        jsonrpc: "2.0",
        id: "sse-1",
        result: {
          tools: [{ name: "nodes.list" }, { name: "flows.apply" }, { name: "flows.create_draft" }],
        },
      })}`,
      "",
    ].join("\n");

    const fakeFetch: typeof fetch = () => {
      return Promise.resolve(
        new Response(ssePayload, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "jwt-1",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify({
        jsonrpc: "2.0",
        id: "sse-1",
        method: "tools/list",
      }),
    });

    expect(reply.status).toBe(200);
    const body = reply.body as {
      result: { tools: readonly { name: string }[] };
    };
    const toolNames = body.result.tools.map((t) => t.name);
    expect(toolNames).toContain("nodes.list");
    expect(toolNames).toContain("flows.create_draft");
    expect(toolNames).not.toContain("flows.apply");
  });

  it("tools/list no muestra flows.apply", async () => {
    const upstreamTools = [
      { name: "nodes.list", description: "List nodes" },
      { name: "flows.apply", description: "Apply draft" },
      { name: "flows.publish", description: "Publish flow" },
      { name: "flows.declare_as_node", description: "Declare node" },
      { name: "flows.create_draft", description: "Create draft" },
    ];

    const fakeFetch: typeof fetch = () => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "list-1",
            result: { tools: upstreamTools },
          }),
        ),
      );
    };

    const tokens = createJobTokens();
    const issued = tokens.issue({
      jobId: "job-1",
      userId: "user-1",
      accessToken: "jwt-1",
    });

    const deps = {
      tokens,
      mcpUrl: "https://mcp.internal",
      fetch: fakeFetch,
      allowlist: PROXY_ALLOWLIST,
    };

    const reply = await handleSandboxMcp(deps, {
      authorization: `Bearer ${issued.token}`,
      rawBody: JSON.stringify({
        jsonrpc: "2.0",
        id: "list-1",
        method: "tools/list",
      }),
    });

    expect(reply.status).toBe(200);
    const body = reply.body as {
      result: { tools: readonly { name: string }[] };
    };
    const toolNames = body.result.tools.map((t) => t.name);
    expect(toolNames).toContain("nodes.list");
    expect(toolNames).toContain("flows.create_draft");
    expect(toolNames).not.toContain("flows.apply");
    expect(toolNames).not.toContain("flows.publish");
    expect(toolNames).not.toContain("flows.declare_as_node");
  });
});
