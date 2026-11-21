import { DataPage, parse } from "@nodomics/protocol";
import type { Table } from "./test-case.ts";

export function parseTable(value: unknown): Table {
  if (typeof value !== "object" || value === null) throw new Error("Expected table object");
  const table = parse(DataPage, { ...value, total: 0 });
  if (!table.ok) throw new Error(`Invalid table: ${JSON.stringify(table.error)}`);
  if (table.value.rows.some((row) => row.length !== table.value.columns.length))
    throw new Error("Table row width differs from columns");
  return { columns: table.value.columns, rows: table.value.rows };
}
