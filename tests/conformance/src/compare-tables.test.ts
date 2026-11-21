import { expect, it } from "vitest";
import { compareTables } from "./compare-tables.ts";

it("compares numeric values with relative tolerance and ISO dates", () => {
  const expected = {
    columns: [
      { name: "n", type: "number" as const },
      { name: "d", type: "date" as const },
    ],
    rows: [[2, "2024-01-01"]],
  };
  expect(
    compareTables({ ...expected, rows: [[2.000000001, "2024-01-01T00:00:00.000Z"]] }, expected).ok,
  ).toBe(true);
  expect(compareTables({ ...expected, rows: [[2.1, "2024-01-01"]] }, expected).ok).toBe(false);
});
it("reports column, row and cell differences", () => {
  const result = compareTables(
    { columns: [{ name: "x", type: "text" }], rows: [["wrong"], [3]] },
    { columns: [{ name: "y", type: "text" }], rows: [["right"]] },
  );
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected differences");
  expect(result.error.join(" ")).toMatch(/column.*row.*cell/is);
});

it("rejects changed column types even when cells match", () => {
  expect(
    compareTables(
      { columns: [{ name: "n", type: "text" }], rows: [[3]] },
      { columns: [{ name: "n", type: "number" }], rows: [[3]] },
    ).ok,
  ).toBe(false);
});

it.each(["3", "0x10"])("rejects numeric engine text %s", (value) => {
  const columns = [{ name: "n", type: "number" as const }];
  expect(compareTables({ columns, rows: [[value]] }, { columns, rows: [[Number(value)]] }).ok).toBe(
    false,
  );
});

it.each(["01/01/2024", "2024-01-01T01:00:00Z"])(
  "rejects non-date or non-midnight text %s",
  (value) => {
    const columns = [{ name: "d", type: "date" as const }];
    expect(
      compareTables({ columns, rows: [[value]] }, { columns, rows: [["2024-01-01"]] }).ok,
    ).toBe(false);
  },
);

it("does not normalize ISO dates in text columns", () => {
  const columns = [{ name: "d", type: "text" as const }];
  expect(
    compareTables(
      { columns, rows: [["2024-01-01T00:00:00Z"]] },
      { columns, rows: [["2024-01-01"]] },
    ).ok,
  ).toBe(false);
});
