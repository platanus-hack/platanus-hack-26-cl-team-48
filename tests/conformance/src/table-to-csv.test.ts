import { expect, it } from "vitest";
import { tableToCsv } from "./table-to-csv.ts";

const table = {
  columns: [{ name: 'a,"b', type: "text" as const }],
  rows: [['a,"b'], [null], ["a\nb"]],
};

it("escapes headers, quotes, newlines and null cells as CSV bytes", () => {
  expect(new TextDecoder().decode(tableToCsv(table))).toBe('"a,""b"\n"a,""b"\n""\n"a\nb"\n');
});

it("preserves a null row in a single-column table", () => {
  expect(
    new TextDecoder().decode(
      tableToCsv({
        columns: [{ name: "n", type: "number" }],
        rows: [[null]],
      }),
    ),
  ).toBe('n\n""\n');
});

it("keeps null cells unquoted and empty text quoted when a row has several columns", () => {
  expect(
    new TextDecoder().decode(
      tableToCsv({
        columns: [
          { name: "a", type: "text" },
          { name: "b", type: "text" },
        ],
        rows: [[null, ""]],
      }),
    ),
  ).toBe('a,b\n,""\n');
});
