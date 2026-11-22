import { describe, expect, it } from "vitest";
import { createStructuredLogger, redactSecrets } from "../src/http/guards/logger.ts";

describe("structured logger guard", () => {
  it("logger redacts secrets", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      output: (line) => lines.push(line),
      clock: () => "2026-11-21T15:00:00.000Z",
    });

    logger.info("Incoming request", {
      headers: {
        authorization: "Bearer secret-jwt-token-12345",
        "content-type": "application/json",
      },
      apiKey: "sk-ant-api03-abcdef1234567890",
      nested: {
        token: "ghp_1234567890abcdef",
        userMessage: "My key is sk-ant-secret1234567890 in text",
      },
    });

    expect(lines).toHaveLength(1);
    const logged = lines[0] ?? "";

    expect(logged).not.toContain("secret-jwt-token-12345");
    expect(logged).not.toContain("sk-ant-api03-abcdef1234567890");
    expect(logged).not.toContain("ghp_1234567890abcdef");
    expect(logged).not.toContain("sk-ant-secret1234567890");

    const parsed = JSON.parse(logged) as Record<string, unknown>;
    expect(parsed["level"]).toBe("info");
    expect(parsed["message"]).toBe("Incoming request");
    expect(parsed["timestamp"]).toBe("2026-11-21T15:00:00.000Z");
  });

  it("redacts bearer tokens inside freeform string values", () => {
    const raw = "Error: request failed with Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig";
    const redacted = redactSecrets(raw);

    expect(redacted).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(redacted).toContain("Bearer [REDACTED]");
  });
});
