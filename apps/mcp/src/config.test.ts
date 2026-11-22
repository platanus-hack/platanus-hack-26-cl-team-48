import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const VALID_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-public-key",
};

describe("loadConfig", () => {
  it("loads the Supabase URL and anon key with the default port 8790", () => {
    const result = loadConfig(VALID_ENV);

    expect(result).toEqual({
      ok: true,
      value: {
        supabaseUrl: "https://project.supabase.co",
        supabaseAnonKey: "anon-public-key",
        port: 8790,
      },
    });
  });

  it("reads the port from PORT", () => {
    const result = loadConfig({ ...VALID_ENV, PORT: "10000" });

    expect(result).toMatchObject({ ok: true, value: { port: 10000 } });
  });

  it.each([["1"], ["65535"]])("accepts the boundary port %s", (port) => {
    const result = loadConfig({ ...VALID_ENV, PORT: port });

    expect(result).toMatchObject({ ok: true, value: { port: Number(port) } });
  });

  it("reports a missing SUPABASE_URL", () => {
    const result = loadConfig({ SUPABASE_ANON_KEY: "anon-public-key" });

    expect(result).toEqual({
      ok: false,
      error: { issues: [{ variable: "SUPABASE_URL", kind: "missing" }] },
    });
  });

  it("reports a missing SUPABASE_ANON_KEY", () => {
    const result = loadConfig({ SUPABASE_URL: "https://project.supabase.co" });

    expect(result).toEqual({
      ok: false,
      error: { issues: [{ variable: "SUPABASE_ANON_KEY", kind: "missing" }] },
    });
  });

  it("reports every missing variable at once", () => {
    const result = loadConfig({});

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.error.issues).toEqual(
      expect.arrayContaining([
        { variable: "SUPABASE_URL", kind: "missing" },
        { variable: "SUPABASE_ANON_KEY", kind: "missing" },
      ]),
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
    const secretLookingUrl = "http://leaked-value.example";

    const result = loadConfig({ SUPABASE_URL: secretLookingUrl, PORT: "leaked-port" });

    expect(JSON.stringify(result)).not.toContain("leaked");
  });
});
