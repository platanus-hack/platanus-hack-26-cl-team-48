import type { Column } from "@nodomics/protocol";

export type Cell = string | number | null;

export type Row = readonly Cell[];

/** An in-memory result: rows hold cells in the order of `columns`. */
export type Table = {
  readonly columns: readonly Column[];
  readonly rows: readonly Row[];
};

export const columnIndex = (table: Table, name: string): number =>
  table.columns.findIndex((column) => column.name === name);

/** Orders cells as a database would: numbers numerically, text alphabetically, nulls first. */
export function compareCells(left: Cell, right: Cell): number {
  if (left === null || right === null) return Number(right === null) - Number(left === null);
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}
