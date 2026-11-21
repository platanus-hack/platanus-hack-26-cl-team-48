import { columnIndex, type Cell, type Table } from "./table.ts";

type FilterOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contiene";

type SimpleFilter = { readonly column: string; readonly op: FilterOp; readonly value: string };

const compareCell = (cell: string | number, value: string): number =>
  typeof cell === "number" ? cell - Number(value) : cell.localeCompare(value);

const FILTER_OPS: Readonly<Record<FilterOp, (cell: string | number, value: string) => boolean>> = {
  "=": (cell, value) => compareCell(cell, value) === 0,
  "!=": (cell, value) => compareCell(cell, value) !== 0,
  ">": (cell, value) => compareCell(cell, value) > 0,
  "<": (cell, value) => compareCell(cell, value) < 0,
  ">=": (cell, value) => compareCell(cell, value) >= 0,
  "<=": (cell, value) => compareCell(cell, value) <= 0,
  contiene: (cell, value) => String(cell).toLowerCase().includes(value.toLowerCase()),
};

/** Rows of `table` that pass the `core.filter` params; anything else leaves the table as is. */
export function applySimpleFilter(table: Table, params: Readonly<Record<string, unknown>>): Table {
  const filter = parseSimpleFilter(params);
  const index = filter === undefined ? -1 : columnIndex(table, filter.column);
  return filter === undefined || index < 0
    ? table
    : { ...table, rows: table.rows.filter((row) => matches(row[index] ?? null, filter)) };
}

function parseSimpleFilter(params: Readonly<Record<string, unknown>>): SimpleFilter | undefined {
  const { column, op = "=", value } = params;
  return typeof column === "string" && typeof value === "string" && isFilterOp(op)
    ? { column, op, value }
    : undefined;
}

const isFilterOp = (op: unknown): op is FilterOp =>
  typeof op === "string" && Object.hasOwn(FILTER_OPS, op);

const matches = (cell: Cell, filter: SimpleFilter): boolean =>
  cell !== null && FILTER_OPS[filter.op](cell, filter.value);
