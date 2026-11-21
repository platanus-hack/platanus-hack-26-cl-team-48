import type { Column, ColumnProfile, DataProfile } from "@nodomics/protocol";
import { compareCells, type Cell, type Table } from "./table.ts";

/** Real per-column statistics of `table`. Histograms are out of scope, so `bins` stays empty. */
export function profileTable(table: Table): DataProfile {
  return {
    columns: table.columns.map((column, index) =>
      profileColumn(
        column,
        table.rows.map((row) => row[index] ?? null),
      ),
    ),
  };
}

function profileColumn(column: Column, cells: readonly Cell[]): ColumnProfile {
  const present = cells.filter((cell) => cell !== null);
  return {
    ...column,
    count: cells.length,
    nulls: cells.length - present.length,
    distinct: new Set(present).size,
    ...boundsOf(present),
    ...meanOf(present),
    bins: [],
  };
}

function boundsOf(cells: readonly (string | number)[]): { min?: string; max?: string } {
  const sorted = [...cells].sort(compareCells);
  const [min] = sorted;
  const max = sorted.at(-1);
  return min === undefined || max === undefined ? {} : { min: String(min), max: String(max) };
}

function meanOf(cells: readonly (string | number)[]): { mean?: number } {
  const numbers = cells.filter((cell) => typeof cell === "number");
  return numbers.length === 0
    ? {}
    : { mean: numbers.reduce((sum, value) => sum + value, 0) / numbers.length };
}
