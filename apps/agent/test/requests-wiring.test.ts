import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import type { AgentConfig } from "../src/config.ts";
import { ok } from "@nodomics/protocol";
import type { LlmPort, LlmTurn } from "../src/llm/llm-port.ts";
import { createFakeMcp } from "../src/mcp/fake-mcp.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";
import { createDevIdentity } from "../src/requests/identity.ts";
import { assembleServer, buildRequestDeps, buildServer } from "../src/requests/wiring.ts";

const CONFIG: AgentConfig = {
  anthropicApiKey: "fixture-anthropic",
  voyageApiKey: "fixture-voyage",
  supabaseUrl: "https://supabase.example",
  supabaseAnonKey: "fixture-anon",
  mcpUrl: "fake",
  port: 8787,
  devIdentity: false,
  memory: "fake",
};

describe("buildRequestDeps", () => {
  it("MCP_URL=fake uses the in-memory mcp", async () => {
    const tools = await buildRequestDeps(CONFIG).mcp.listTools();

    expect(tools.ok && tools.value.map((tool) => tool.name)).toContain("flows.create_draft");
  });

  it("requires a bearer unless the dev identity is on", async () => {
    const strict = await buildRequestDeps(CONFIG).identity.resolve(undefined);
    const dev = await buildRequestDeps({ ...CONFIG, devIdentity: true }).identity.resolve(
      undefined,
    );

    expect(strict).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(dev).toMatchObject({ ok: true });
  });
});

describe("buildServer", () => {
  it("start wires the why route", async () => {
    const server = buildServer({ ...CONFIG, devIdentity: true });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${String(port)}/agent/components/n1/why`);

    await new Promise((resolve) => server.close(resolve));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_query" });
  });

  it("start wires the search route", async () => {
    const server = buildServer({ ...CONFIG, devIdentity: true, voyageApiKey: "fake" });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${String(port)}/agent/search?q=crop`);

    await new Promise((resolve) => server.close(resolve));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cards: [] });
  });
});

describe("wired proposals and scoped memory", () => {
  it("wired request returns a proposal with cards", async () => {
    const deps = {
      ...buildRequestDeps({ ...CONFIG, devIdentity: true }),
      llm: scriptedAgentAndStoryLlm(),
    };
    const server = assembleServer(deps, createFakeMemory());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${String(port)}/agent/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: "crea un filtro" }),
    });

    await new Promise((resolve) => server.close(resolve));
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["proposalId"]).toBeDefined();
    expect(Array.isArray(body["cards"])).toBe(true);
  });

  it("supabase memory is created per request with the user token", async () => {
    const seenTokens: string[] = [];
    const deps = {
      ...buildRequestDeps({
        ...CONFIG,
        memory: "supabase",
      }),
      identity: {
        resolve: (bearer: string | undefined) =>
          Promise.resolve(ok({ userId: "u1", accessToken: bearer ?? "" })),
      },
      llm: scriptedAgentAndStoryLlm(),
      memoryForUser: (identity: { accessToken: string }) => {
        seenTokens.push(identity.accessToken);
        return createFakeMemory();
      },
    };

    const server = assembleServer(deps, createFakeMemory());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    await fetch(`http://127.0.0.1:${String(port)}/agent/requests`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-user-abc",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal: "hola" }),
    });

    await new Promise((resolve) => server.close(resolve));
    expect(seenTokens).toContain("token-user-abc");
  });
});

const toolCall = (id: string, name: string, args: unknown): LlmTurn => ({
  kind: "tool_calls",
  calls: [{ id, name, args }],
});

/** Agent turns follow a script; story turns (no tools offered) cite the first episode they are shown. */
function scriptedAgentAndStoryLlm(): LlmPort {
  const agentTurns: LlmTurn[] = [
    toolCall("c1", "flows.create_draft", {}),
    toolCall("c2", "flows.add_node", { draftId: "draft-1", type: "table.filter", nodeId: "n1" }),
    { kind: "text", text: "Listo" },
  ];
  return {
    complete: (request) => {
      if (request.tools.length > 0) {
        return Promise.resolve(ok(agentTurns.shift() ?? { kind: "text" as const, text: "fin" }));
      }
      const text = JSON.stringify(request.messages);
      const id = /"id":"([0-9a-f-]{36})"/.exec(text.replaceAll("\\", ""))?.[1] ?? "none";
      return Promise.resolve(ok({ kind: "text" as const, text: `Se creó el nodo [${id}].` }));
    },
  };
}

async function call(base: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${base}${path}`, init);
}

describe("shared memory", () => {
  it("a request leaves episodes that the why route can explain", async () => {
    const deps = {
      identity: createDevIdentity(),
      llm: scriptedAgentAndStoryLlm(),
      mcp: createFakeMcp(),
    };
    const server = assembleServer(deps, createFakeMemory());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;

    const request = await call(base, "/agent/requests", {
      method: "POST",
      body: JSON.stringify({ goal: "haz un filtro" }),
    });
    const why = await call(base, "/agent/components/n1/why?q=por%20que");

    await new Promise((resolve) => server.close(resolve));
    expect(request.status).toBe(200);
    expect(why.status).toBe(200);
    expect(await why.json()).toMatchObject({ citations: [expect.any(String)] });
  });
});
