import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { err, ok } from "@nodomics/protocol";
import { afterEach, describe, expect, it } from "vitest";
import type { IdentityPort, UserIdentity } from "./identity.ts";
import { createMcpServer } from "./server.ts";
import type { Tools } from "./tools.ts";

const DESCRIPTOR = {
  name: "flows.get",
  description: "Read a flow",
  inputSchema: { type: "object", properties: {} },
};
const USER: UserIdentity = { userId: "user", accessToken: "valid-token" };
const servers: Server[] = [];
const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((error) => {
            if (error === undefined) resolve();
            else reject(error);
          });
        }),
    ),
  );
});

async function startServer(authFailure?: "UNAVAILABLE") {
  const calls: { name: string; args: unknown; identity: UserIdentity }[] = [];
  const identity: IdentityPort = {
    resolve: (authorization) =>
      Promise.resolve(
        authFailure === undefined
          ? authorization === "Bearer valid-token"
            ? ok(USER)
            : err({ code: "UNAUTHORIZED", message: "Sign in" })
          : err({ code: authFailure, message: "Auth service down" }),
      ),
  };
  const tools: Tools = {
    list: () => [DESCRIPTOR],
    call: (name, args, user) => {
      calls.push({ name, args, identity: user });
      if (name === "unknown") return Promise.resolve("unknown-tool");
      if (name === "invalid") return Promise.resolve("invalid-args");
      if (name === "failure") return Promise.resolve(err({ message: "Cannot read flow" }));
      if (name === "array") return Promise.resolve(ok(["a", "b"]));
      return Promise.resolve(ok({ id: "flow-1" }));
    },
  };
  const server = createMcpServer({ tools, identity });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("No HTTP address");
  return { url: new URL(`http://127.0.0.1:${String(address.port)}/mcp`), calls };
}

async function connect(url: URL, token?: string) {
  const client = new Client({ name: "mcp-test", version: "0.1.0" });
  clients.push(client);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: token === undefined ? {} : { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return client;
}

describe("MCP HTTP server", () => {
  it("serves health without authentication", async () => {
    const { url } = await startServer();

    const response = await fetch(new URL("/health", url));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns 404 for another route", async () => {
    const { url } = await startServer();

    expect((await fetch(new URL("/missing", url))).status).toBe(404);
  });

  it("lists tools through the real SDK without a token", async () => {
    const { url, calls } = await startServer();
    const client = await connect(url);

    const result = await client.listTools();

    expect(result.tools).toEqual([DESCRIPTOR]);
    expect(calls).toEqual([]);
  });

  it("calls tools with the resolved identity and returns text and structured content", async () => {
    const { url, calls } = await startServer();
    const client = await connect(url, "valid-token");

    const result = await client.callTool({ name: "flows.get", arguments: { flowId: "flow-1" } });

    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ id: "flow-1" }) }]);
    expect(result.structuredContent).toEqual({ id: "flow-1" });
    expect(calls).toEqual([{ name: "flows.get", args: { flowId: "flow-1" }, identity: USER }]);
  });

  it("encodes array results as JSON text", async () => {
    const { url } = await startServer();
    const client = await connect(url, "valid-token");

    const result = await client.callTool({ name: "array", arguments: {} });

    expect(result.content).toEqual([{ type: "text", text: '["a","b"]' }]);
    expect(result.structuredContent).toBeUndefined();
  });

  it("returns domain errors as tool errors", async () => {
    const { url } = await startServer();
    const client = await connect(url, "valid-token");

    const result = await client.callTool({ name: "failure", arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: "Cannot read flow" }]);
  });

  it.each([undefined, "invalid-token"])(
    "rejects a tool call with token %s before dispatching",
    async (token) => {
      const { url, calls } = await startServer();
      const client = await connect(url, token);

      await expect(client.callTool({ name: "flows.get", arguments: {} })).rejects.toThrow(/401/);
      expect(calls).toEqual([]);
    },
  );

  it("returns 503 when identity resolution is unavailable", async () => {
    const { url, calls } = await startServer("UNAVAILABLE");
    const client = await connect(url, "valid-token");

    await expect(client.callTool({ name: "flows.get", arguments: {} })).rejects.toThrow(/503/);
    expect(calls).toEqual([]);
  });

  it("maps unknown tools to JSON-RPC MethodNotFound", async () => {
    const { url } = await startServer();
    const client = await connect(url, "valid-token");

    await expect(client.callTool({ name: "unknown", arguments: {} })).rejects.toMatchObject({
      code: -32601,
    });
  });

  it("maps invalid arguments to JSON-RPC InvalidParams", async () => {
    const { url } = await startServer();
    const client = await connect(url, "valid-token");

    await expect(client.callTool({ name: "invalid", arguments: {} })).rejects.toMatchObject({
      code: -32602,
    });
  });

  it("does not require a session id between independent SDK clients", async () => {
    const { url } = await startServer();
    const first = await connect(url);
    const second = await connect(url);

    expect((await first.listTools()).tools).toEqual([DESCRIPTOR]);
    expect((await second.listTools()).tools).toEqual([DESCRIPTOR]);
  });
});
