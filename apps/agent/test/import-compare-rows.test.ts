import { describe, expect, it } from "vitest";
import { compareRows, NUMERIC_TOLERANCE } from "../src/import/compare-rows.ts";
import type { Row } from "../src/import/import-report.ts";

describe("compareRows (D2)", () => {
  it("null does not equal 0", () => {
    const expected: readonly Row[] = [{ val: null }];
    const observed: readonly Row[] = [{ val: 0 }];

    const result = compareRows(expected, observed);
    expect(result.equal).toBe(false);
    expect(result.diff).toContain("null");
    expect(result.diff).toContain("0");
  });

  it("null does not equal empty string", () => {
    const expected: readonly Row[] = [{ val: null }];
    const observed: readonly Row[] = [{ val: "" }];

    const result = compareRows(expected, observed);
    expect(result.equal).toBe(false);
    expect(result.diff).toContain("null");
  });

  it("order is indifferent by default", () => {
    const expected: readonly Row[] = [{ id: "a" }, { id: "b" }];
    const observed: readonly Row[] = [{ id: "b" }, { id: "a" }];

    const result = compareRows(expected, observed);
    expect(result.equal).toBe(true);
    expect(result.diff).toBe("");
  });

  it("order is respected when ordered is true", () => {
    const expected: readonly Row[] = [{ id: "a" }, { id: "b" }];
    const observed: readonly Row[] = [{ id: "b" }, { id: "a" }];

    const result = compareRows(expected, observed, { ordered: true });
    expect(result.equal).toBe(false);
    expect(result.diff.length).toBeGreaterThan(0);
  });

  it("numbers match within 1e-9 tolerance", () => {
    expect(NUMERIC_TOLERANCE).toBe(1e-9);
    const expected: readonly Row[] = [{ val: 1.0 }];
    const observed: readonly Row[] = [{ val: 1.0 + 5e-10 }];

    const result = compareRows(expected, observed);
    expect(result.equal).toBe(true);
    expect(result.diff).toBe("");
  });

  it("numbers outside 1e-9 tolerance do not match", () => {
    const expected: readonly Row[] = [{ val: 1.0 }];
    const observed: readonly Row[] = [{ val: 1.0 + 2e-9 }];

    const result = compareRows(expected, observed);
    expect(result.equal).toBe(false);
    expect(result.diff.length).toBeGreaterThan(0);
  });

  it("extra or missing rows yield equal false with readable diff", () => {
    const expected: readonly Row[] = [{ id: 1 }, { id: 2 }];
    const observedMissing: readonly Row[] = [{ id: 1 }];
    const observedExtra: readonly Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const resMissing = compareRows(expected, observedMissing);
    expect(resMissing.equal).toBe(false);
    expect(resMissing.diff).toContain("Expected 2 rows, observed 1 rows");

    const resExtra = compareRows(expected, observedExtra);
    expect(resExtra.equal).toBe(false);
    expect(resExtra.diff).toContain("Expected 2 rows, observed 3 rows");
  });
});
