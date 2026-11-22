import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const VALID_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  RENDER_API_KEY: "rnd_secret_api_key",
  RENDER_OWNER_ID: "tea-owner",
  DEPLOY_ALLOWED_ORIGINS: "https://nodomics.app",
};

const REQUIRED_VARIABLES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RENDER_API_KEY",
  "RENDER_OWNER_ID",
] as const;

const without = (variable: string): Record<string, string> =>
  Object.fromEntries(Object.entries(VALID_ENV).filter(([key]) => key !== variable));

describe("loadConfig", () => {
  it("loads every variable with the default port 8791", () => {
    const result = loadConfig(VALID_ENV);

    expect(result).toEqual({
      ok: true,
      value: {
        supabaseUrl: "https://project.supabase.co",
        supabaseAnonKey: "anon-public-key",
        supabaseServiceRoleKey: "service-role-key",
        renderApiKey: "rnd_secret_api_key",
        renderOwnerId: "tea-owner",
        allowedOrigins: ["https://nodomics.app"],
        port: 8791,
      },
    });
  });

  it("splits the allowed origins by comma, trimming spaces and skipping empty entries", () => {
    const result = loadConfig({
      ...VALID_ENV,
      DEPLOY_ALLOWED_ORIGINS: " https://nodomics.app , ,http://localhost:5173,",
    });

    expect(result).toMatchObject({
      ok: true,
      value: { allowedOrigins: ["https://nodomics.app", "http://localhost:5173"] },
    });
  });

  it("accepts an empty list of allowed origins", () => {
    const result = loadConfig({ ...VALID_ENV, DEPLOY_ALLOWED_ORIGINS: "" });

    expect(result).toMatchObject({ ok: true, value: { allowedOrigins: [] } });
  });

  it("treats a missing DEPLOY_ALLOWED_ORIGINS as no allowed origins", () => {
    const result = loadConfig(without("DEPLOY_ALLOWED_ORIGINS"));

    expect(result).toMatchObject({ ok: true, value: { allowedOrigins: [] } });
  });

  it("reads the port from PORT", () => {
    const result = loadConfig({ ...VALID_ENV, PORT: "10000" });

    expect(result).toMatchObject({ ok: true, value: { port: 10000 } });
  });

  it.each([["1"], ["65535"]])("accepts the boundary port %s", (port) => {
    const result = loadConfig({ ...VALID_ENV, PORT: port });

    expect(result).toMatchObject({ ok: true, value: { port: Number(port) } });
  });

  it.each(REQUIRED_VARIABLES.map((variable) => [variable]))("reports a missing %s", (variable) => {
    const result = loadConfig(without(variable));

    expect(result).toEqual({ ok: false, error: { issues: [{ variable, kind: "missing" }] } });
  });

  it("reports every missing variable at once", () => {
    const result = loadConfig({});

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.error.issues).toEqual(
      expect.arrayContaining(REQUIRED_VARIABLES.map((variable) => ({ variable, kind: "missing" }))),
    );
  });

  it.each([["http://project.supabase.co"], ["not a url"], ["ftp://project.supabase.co"]])(
    "rejects the non-https SUPABASE_URL %j as invalid",
    (url) => {
      const result = loadConfig({ ...VALID_ENV, SUPABASE_URL: url });

      expect(result).toEqual({
        ok: false,
        error: { issues: [{ variable: "SUPABASE_URL", kind: "invalid" }] },
      });
    },
  );

  it.each([["abc"], ["0"], ["65536"], ["-1"], ["80.5"]])(
    "rejects the PORT %j as invalid",
    (port) => {
      const result = loadConfig({ ...VALID_ENV, PORT: port });

      expect(result).toEqual({
        ok: false,
        error: { issues: [{ variable: "PORT", kind: "invalid" }] },
      });
    },
  );

  it("never includes the value of a variable in its errors", () => {
    const result = loadConfig({
      SUPABASE_URL: "http://leaked-url.example",
      RENDER_API_KEY: "rnd_leaked_key",
      PORT: "leaked-port",
    });

    expect(JSON.stringify(result)).not.toContain("leaked");
  });
});
