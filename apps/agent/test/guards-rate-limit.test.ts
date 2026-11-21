import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/http/guards/rate-limit.ts";

describe("rate-limit guard", () => {
  it("blocks the seventh request in a minute", () => {
    let now = 1_000_000;
    const limiter = createRateLimiter({ perMinute: 6, clock: () => now });

    for (let i = 0; i < 6; i++) {
      expect(limiter.check("user-1")).toBe(true);
    }
    expect(limiter.check("user-1")).toBe(false);

    // Advances 61 seconds
    now += 61_000;
    expect(limiter.check("user-1")).toBe(true);
  });

  it("limits are per user", () => {
    const limiter = createRateLimiter({ perMinute: 6 });

    for (let i = 0; i < 6; i++) {
      expect(limiter.check("user-1")).toBe(true);
    }
    expect(limiter.check("user-1")).toBe(false);
    expect(limiter.check("user-2")).toBe(true);
  });
});
