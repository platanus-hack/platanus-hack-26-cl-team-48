import { describe, expect, it } from "vitest";
import { MAX_SERVICES_PER_USER, MAX_SERVICES_TOTAL, checkQuota } from "./limits.ts";

describe("limits", () => {
  it("allows at most 2 services per user and 20 in total", () => {
    expect(MAX_SERVICES_PER_USER).toBe(2);
    expect(MAX_SERVICES_TOTAL).toBe(20);
  });
});

describe("checkQuota", () => {
  it.each([
    [0, 0],
    [1, 1],
    [1, 19],
  ])("allows a create with %i services of the user and %i in total", (userCount, totalCount) => {
    const result = checkQuota({ action: "create", userCount, totalCount });

    expect(result.ok).toBe(true);
  });

  it.each([[2], [3]])(
    "rejects a create with QUOTA_USER when the user has %i services",
    (userCount) => {
      const result = checkQuota({ action: "create", userCount, totalCount: 5 });

      expect(result).toMatchObject({ ok: false, error: { code: "QUOTA_USER" } });
    },
  );

  it.each([[20], [25]])(
    "rejects a create with QUOTA_TOTAL when there are %i services",
    (totalCount) => {
      const result = checkQuota({ action: "create", userCount: 0, totalCount });

      expect(result).toMatchObject({ ok: false, error: { code: "QUOTA_TOTAL" } });
    },
  );

  it("reports QUOTA_USER first when both quotas are exceeded", () => {
    const result = checkQuota({ action: "create", userCount: 2, totalCount: 20 });

    expect(result).toMatchObject({ ok: false, error: { code: "QUOTA_USER" } });
  });

  it.each([["update" as const], ["unchanged" as const]])(
    "never limits an %s even when both quotas are exceeded",
    (action) => {
      const result = checkQuota({ action, userCount: 2, totalCount: 20 });

      expect(result.ok).toBe(true);
    },
  );

  it("returns quota errors with a readable message", () => {
    const result = checkQuota({ action: "create", userCount: 2, totalCount: 2 });

    expect(result.ok ? "" : result.error.message).not.toBe("");
  });
});
