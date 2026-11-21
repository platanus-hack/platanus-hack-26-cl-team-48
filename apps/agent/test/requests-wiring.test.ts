import { describe, expect, it } from "vitest";
import type { AgentConfig } from "../src/config.ts";
import { buildRequestDeps } from "../src/requests/wiring.ts";

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
