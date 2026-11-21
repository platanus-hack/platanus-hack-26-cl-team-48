import { formatNumber } from "./format-number.ts";
import { MESSAGES } from "./messages.ts";
import type { ColumnType } from "./types.ts";

export type CellError = { readonly error: string; readonly value: unknown };

export type CellContent =
  | { readonly kind: "null" }
  | { readonly kind: "error"; readonly message: string; readonly text: string }
  | { readonly kind: "text"; readonly text: string };

export function describeCell(value: unknown, type: ColumnType): CellContent {
  if (value === null || value === undefined) return { kind: "null" };
  if (isCellError(value)) return { kind: "error", message: value.error, text: String(value.value) };
  return { kind: "text", text: formatValue(value, type) };
}

function isCellError(value: unknown): value is CellError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

function formatValue(value: unknown, type: ColumnType): string {
  if (type === "number" && typeof value === "number") return formatNumber(value);
  if (type === "bool" && typeof value === "boolean") {
    return value ? MESSAGES.dataGrid.trueValue : MESSAGES.dataGrid.falseValue;
  }
  return String(value);
}
