import { err, ok, type ColumnType, type Result } from "@nodomics/protocol";
import { isDeepStrictEqual } from "node:util";
import type { Table } from "./test-case.ts";

const DEFAULT_TOLERANCE = 1e-9;

export function compareTables(
  actual: Table,
  expected: Table,
  options: { readonly tolerance?: number } = {},
): Result<void, readonly string[]> {
  const differences = compareShape(actual, expected);
  differences.push(...compareCells(actual, expected, options.tolerance ?? DEFAULT_TOLERANCE));
  return differences.length === 0 ? ok(undefined) : err(differences);
}

function compareCells(actual: Table, expected: Table, tolerance: number): string[] {
  const differences: string[] = [];
  expected.rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const type = expected.columns[columnIndex]?.type;
      if (
        !equalCells(
          normalizeDate(actual.rows[rowIndex]?.[columnIndex], type),
          normalizeDate(cell, type),
          tolerance,
        )
      )
        differences.push(
          `cell row ${String(rowIndex + 1)}, column ${expected.columns[columnIndex]?.name ?? String(columnIndex)}: expected ${String(cell)}, got ${String(actual.rows[rowIndex]?.[columnIndex])}`,
        );
    });
  });
  return differences;
}

function compareShape(actual: Table, expected: Table): string[] {
  const differences: string[] = [];
  if (
    !isDeepStrictEqual(
      actual.columns.map(({ name, type }) => ({ name, type })),
      expected.columns.map(({ name, type }) => ({ name, type })),
    )
  )
    differences.push(
      `columns: expected ${expected.columns.map((column) => `${column.name}:${column.type}`).join(", ")}, got ${actual.columns.map((column) => `${column.name}:${column.type}`).join(", ")}`,
    );
  if (actual.rows.length !== expected.rows.length)
    differences.push(
      `rows: expected ${String(expected.rows.length)}, got ${String(actual.rows.length)}`,
    );
  actual.rows.forEach((row, index) => {
    if (row.length !== expected.columns.length)
      differences.push(
        `row ${String(index + 1)} width: expected ${String(expected.columns.length)}, got ${String(row.length)}`,
      );
  });
  return differences;
}

function normalizeDate(value: unknown, type: ColumnType | undefined): unknown {
  if (type !== "date" || typeof value !== "string") return value;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ]00:00:00(?:\.0+)?Z?)?$/.exec(value);
  return match?.[1] ?? value;
}

function equalCells(actual: unknown, expected: unknown, tolerance: number): boolean {
  if (typeof actual === "number" && typeof expected === "number")
    return (
      Object.is(actual, expected) ||
      (Number.isFinite(actual) &&
        Number.isFinite(expected) &&
        Math.abs(actual - expected) <= tolerance * Math.max(Math.abs(actual), Math.abs(expected)))
    );
  return isDeepStrictEqual(actual, expected);
}
