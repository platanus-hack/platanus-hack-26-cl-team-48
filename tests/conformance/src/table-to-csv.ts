import type { Table } from "./test-case.ts";

export function tableToCsv(table: Table): Uint8Array {
  return new TextEncoder().encode(
    [table.columns.map((column) => column.name), ...table.rows].map(rowToCsv).join("\n") + "\n",
  );
}

// A lone empty field would be an empty line, which CSV readers skip, so it is quoted.
function rowToCsv(row: readonly unknown[]): string {
  return row.length === 1 && isNull(row[0]) ? '""' : row.map(escapeCell).join(",");
}

function escapeCell(value: unknown): string {
  if (isNull(value)) return "";
  const text = cellText(value);
  return text === "" || /[,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const isNull = (value: unknown): boolean => value === null || value === undefined;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  throw new Error("CSV cells must be scalar values");
}
