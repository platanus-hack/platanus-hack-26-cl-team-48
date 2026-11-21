import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import type { AgentConfig } from "../src/config.ts";
import { buildRequestDeps, buildServer } from "../src/requests/wiring.ts";

const CONFIG: AgentConfig = {
  anthropicApiKey: "fixture-anthropic",
  voyageApiKey: "fixture-voyage",
  supabaseUrl: "https://supabase.example",
  supabaseAnonKey: "fixture-anon",
  mcpUrl: "fake",
  port: 8787,
  devIdentity: false,
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
});
