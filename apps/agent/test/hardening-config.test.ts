import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const PRODUCTION_ENV = {
  ANTHROPIC_API_KEY: "fixture-anthropic",
  VOYAGE_API_KEY: "fixture-voyage",
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_ANON_KEY: "fixture-supabase",
  MCP_URL: "https://mcp.example",
  AGENT_MEMORY: "supabase",
};

const PRODUCTION_MARKERS = [
  ["RENDER", "true"],
  ["NODE_ENV", "production"],
] as const;

const inProduction = (marker: readonly [string, string], extra: Record<string, string>) => ({
  ...PRODUCTION_ENV,
  [marker[0]]: marker[1],
  ...extra,
});

const withoutKey = (key: string) =>
  Object.fromEntries(Object.entries(PRODUCTION_ENV).filter(([name]) => name !== key));

describe.each(PRODUCTION_MARKERS)("production detected by %s=%s", (name, value) => {
  const marker = [name, value] as const;

  it("accepts a fully real configuration", () => {
    expect(loadConfig(inProduction(marker, {}))).toMatchObject({
      ok: true,
      value: { mcpUrl: "https://mcp.example", memory: "supabase", devIdentity: false },
    });
  });

  it("rejects the dev identity", () => {
    expect(loadConfig(inProduction(marker, { AGENT_DEV_IDENTITY: "1" }))).toEqual({
      ok: false,
      error: { issues: [{ variable: "AGENT_DEV_IDENTITY", kind: "invalid" }] },
    });
  });

  it("rejects the dev identity even in explicit demo mode", () => {
    const result = loadConfig(
      inProduction(marker, { AGENT_DEV_IDENTITY: "1", AGENT_ALLOW_FAKES: "1" }),
    );

    expect(result).toEqual({
      ok: false,
      error: { issues: [{ variable: "AGENT_DEV_IDENTITY", kind: "invalid" }] },
    });
  });

  it("rejects the fake MCP", () => {
    expect(loadConfig(inProduction(marker, { MCP_URL: "fake" }))).toEqual({
      ok: false,
      error: { issues: [{ variable: "MCP_URL", kind: "invalid" }] },
    });
  });

  it("rejects the fake memory", () => {
    expect(loadConfig(inProduction(marker, { AGENT_MEMORY: "fake" }))).toEqual({
      ok: false,
      error: { issues: [{ variable: "AGENT_MEMORY", kind: "invalid" }] },
    });
  });

  it("rejects an undefined memory instead of defaulting to fake", () => {
    const result = loadConfig({ ...withoutKey("AGENT_MEMORY"), [name]: value });

    expect(result).toMatchObject({
      ok: false,
      error: { issues: [{ variable: "AGENT_MEMORY" }] },
    });
    const kind = result.ok ? undefined : result.error.issues[0]?.kind;
    expect(["missing", "invalid"]).toContain(kind);
  });

  it("allows fakes when AGENT_ALLOW_FAKES is 1 (demo mode)", () => {
    const result = loadConfig({
      ...withoutKey("AGENT_MEMORY"),
      [name]: value,
      MCP_URL: "fake",
      AGENT_ALLOW_FAKES: "1",
    });

    expect(result).toMatchObject({ ok: true, value: { mcpUrl: "fake", memory: "fake" } });
  });

  it("allows an explicit fake memory in demo mode", () => {
    const result = loadConfig(
      inProduction(marker, { AGENT_MEMORY: "fake", AGENT_ALLOW_FAKES: "1" }),
    );

    expect(result).toMatchObject({ ok: true, value: { memory: "fake" } });
  });

  it.each(["0", "true", ""])("does not treat AGENT_ALLOW_FAKES=%j as demo mode", (flag) => {
    const result = loadConfig(inProduction(marker, { MCP_URL: "fake", AGENT_ALLOW_FAKES: flag }));

    expect(result).toEqual({
      ok: false,
      error: { issues: [{ variable: "MCP_URL", kind: "invalid" }] },
    });
  });

  it("reports every production violation without echoing any value", () => {
    const env = inProduction(marker, {
      AGENT_DEV_IDENTITY: "1",
      MCP_URL: "fake",
      AGENT_MEMORY: "fake",
    });
    const result = loadConfig(env);

    expect(result.ok).toBe(false);
    const variables = result.ok ? [] : result.error.issues.map((issue) => issue.variable);
    expect(variables).toEqual(
      expect.arrayContaining(["AGENT_DEV_IDENTITY", "MCP_URL", "AGENT_MEMORY"]),
    );
    expect(JSON.stringify(result)).not.toContain("fixture-");
    expect(JSON.stringify(result)).not.toContain("fake");
  });
});

describe("outside production", () => {
  const DEV_ENV_WITHOUT_MEMORY = {
    ...withoutKey("AGENT_MEMORY"),
    MCP_URL: "fake",
    AGENT_DEV_IDENTITY: "1",
  };

  it("keeps fakes and the dev identity allowed with no markers", () => {
    expect(loadConfig(DEV_ENV_WITHOUT_MEMORY)).toMatchObject({
      ok: true,
      value: { mcpUrl: "fake", memory: "fake", devIdentity: true },
    });
  });

  it.each([{ RENDER: "false" }, { RENDER: "" }, { NODE_ENV: "development" }, { NODE_ENV: "test" }])(
    "keeps the current behavior with %j",
    (marker) => {
      expect(loadConfig({ ...DEV_ENV_WITHOUT_MEMORY, ...marker })).toMatchObject({
        ok: true,
        value: { mcpUrl: "fake", memory: "fake", devIdentity: true },
      });
    },
  );
});
