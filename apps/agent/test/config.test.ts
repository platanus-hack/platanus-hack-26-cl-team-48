import { expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const VALID_ENV = {
  ANTHROPIC_API_KEY: "fixture-anthropic",
  VOYAGE_API_KEY: "fixture-voyage",
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_ANON_KEY: "fixture-supabase",
  MCP_URL: "https://mcp.example",
};

it("loadConfig fails listing every missing variable", () => {
  expect(loadConfig({})).toEqual({
    ok: false,
    error: {
      issues: Object.keys(VALID_ENV).map((variable) => ({ variable, kind: "missing" })),
    },
  });
});

it("loadConfig error never contains secret values", () => {
  const invalidValues = {
    VOYAGE_API_KEY: undefined,
    SUPABASE_URL: "https://[fixture-supabase-url",
    MCP_URL: "http://mcp.example/fixture-token",
    PORT: "fixture-port",
  };
  const result = loadConfig({ ...VALID_ENV, ...invalidValues });

  expect(result).toEqual({
    ok: false,
    error: {
      issues: [
        { variable: "VOYAGE_API_KEY", kind: "missing" },
        { variable: "SUPABASE_URL", kind: "invalid" },
        { variable: "MCP_URL", kind: "invalid" },
        { variable: "PORT", kind: "invalid" },
      ],
    },
  });
  for (const value of [...Object.values(VALID_ENV), ...Object.values(invalidValues)]) {
    if (value !== undefined) expect(JSON.stringify(result)).not.toContain(value);
  }
});

it("loadConfig rejects non-https MCP_URL", () => {
  expect(loadConfig({ ...VALID_ENV, MCP_URL: "http://mcp.example" })).toEqual({
    ok: false,
    error: { issues: [{ variable: "MCP_URL", kind: "invalid" }] },
  });
});

it("loads all required values and defaults to port 8787", () => {
  expect(loadConfig(VALID_ENV)).toEqual({
    ok: true,
    value: {
      anthropicApiKey: VALID_ENV.ANTHROPIC_API_KEY,
      voyageApiKey: VALID_ENV.VOYAGE_API_KEY,
      supabaseUrl: VALID_ENV.SUPABASE_URL,
      supabaseAnonKey: VALID_ENV.SUPABASE_ANON_KEY,
      mcpUrl: VALID_ENV.MCP_URL,
      port: 8787,
      devIdentity: false,
    },
  });
});

it("loads an explicit port", () => {
  expect(loadConfig({ ...VALID_ENV, PORT: "8080" })).toMatchObject({
    ok: true,
    value: { port: 8080 },
  });
});

it.each(["65536", "0", "-1", "12.5", "1e2", "fixture-port", ""])(
  "rejects invalid PORT %j",
  (PORT) => {
    expect(loadConfig({ ...VALID_ENV, PORT })).toEqual({
      ok: false,
      error: { issues: [{ variable: "PORT", kind: "invalid" }] },
    });
  },
);

it("accepts the fake MCP mode", () => {
  expect(loadConfig({ ...VALID_ENV, MCP_URL: "fake" })).toMatchObject({
    ok: true,
    value: { mcpUrl: "fake" },
  });
});

it.each(["FAKE", "fake://x", "http://fake"])("rejects MCP_URL %j", (MCP_URL) => {
  expect(loadConfig({ ...VALID_ENV, MCP_URL })).toEqual({
    ok: false,
    error: { issues: [{ variable: "MCP_URL", kind: "invalid" }] },
  });
});

it.each([
  ["1", true],
  ["0", false],
  ["true", false],
  [undefined, false],
])("reads AGENT_DEV_IDENTITY %j as %j", (AGENT_DEV_IDENTITY, devIdentity) => {
  expect(loadConfig({ ...VALID_ENV, AGENT_DEV_IDENTITY })).toMatchObject({
    ok: true,
    value: { devIdentity },
  });
});
