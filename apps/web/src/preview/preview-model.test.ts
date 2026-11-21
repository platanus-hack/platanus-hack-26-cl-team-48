import { describe, expect, it } from "vitest";
import { nextPage, toGridColumns, PAGE_SIZE } from "./preview-model.ts";

describe("toGridColumns", () => {
  it("marks the sorted column and translates column types", () => {
    expect(
      toGridColumns(
        [
          { name: "region", type: "text" },
          { name: "monto", type: "number" },
          { name: "raro", type: "other" },
        ],
        { column: "monto", direction: "desc" },
      ),
    ).toEqual([
      { name: "region", type: "text" },
      { name: "monto", type: "number", sorted: "desc" },
      { name: "raro", type: "text" },
    ]);
  });
});

describe("nextPage", () => {
  it("moves by whole pages and stays inside the result", () => {
    expect(nextPage({ offset: 0, total: 250 }, 1)).toBe(PAGE_SIZE);
    expect(nextPage({ offset: 200, total: 250 }, 1)).toBe(200);
    expect(nextPage({ offset: 0, total: 250 }, -1)).toBe(0);
  });

  it("never asks for more than a thousand rows at once", () => {
    expect(PAGE_SIZE).toBeLessThanOrEqual(1000);
  });
});
