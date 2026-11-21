import { describe, expect, it } from "vitest";
import { createCorsGuard } from "../src/http/guards/cors.ts";

describe("cors guard", () => {
  const allowed = "https://nodomics.com, https://app.nodomics.com";

  it("permits allowed origin on standard request", () => {
    const cors = createCorsGuard({ allowedOrigins: allowed });
    const decision = cors.evaluate({
      method: "POST",
      origin: "https://nodomics.com",
    });

    expect(decision.isAllowed).toBe(true);
    expect(decision.isPreflight).toBe(false);
    expect(decision.headers["Access-Control-Allow-Origin"]).toBe("https://nodomics.com");
  });

  it("denies origin not in allowed list", () => {
    const cors = createCorsGuard({ allowedOrigins: allowed });
    const decision = cors.evaluate({
      method: "POST",
      origin: "https://evil.com",
    });

    expect(decision.isAllowed).toBe(false);
    expect(decision.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("handles preflight OPTIONS request for allowed origin", () => {
    const cors = createCorsGuard({ allowedOrigins: allowed });
    const decision = cors.evaluate({
      method: "OPTIONS",
      origin: "https://app.nodomics.com",
    });

    expect(decision.isAllowed).toBe(true);
    expect(decision.isPreflight).toBe(true);
    expect(decision.status).toBe(204);
    expect(decision.headers["Access-Control-Allow-Origin"]).toBe("https://app.nodomics.com");
    expect(decision.headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(decision.headers["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("reads AGENT_ALLOWED_ORIGINS from env by default", () => {
    const envBackup = process.env["AGENT_ALLOWED_ORIGINS"];
    process.env["AGENT_ALLOWED_ORIGINS"] = "https://env.nodomics.com";
    try {
      const cors = createCorsGuard();
      const decision = cors.evaluate({ method: "GET", origin: "https://env.nodomics.com" });
      expect(decision.isAllowed).toBe(true);
    } finally {
      process.env["AGENT_ALLOWED_ORIGINS"] = envBackup;
    }
  });
});
