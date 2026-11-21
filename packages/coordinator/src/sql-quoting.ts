import { err, ok, type Result } from "@nodomics/protocol";

/** A DuckDB identifier: always quoted, embedded quotes doubled. */
export const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/** A DuckDB literal for a JSON scalar; anything else cannot be a single SQL value. */
export function quoteLiteral(value: unknown): Result<string, string> {
  if (value === null || value === undefined) return ok("NULL");
  if (typeof value === "string") return ok(`'${value.replaceAll("'", "''")}'`);
  if (typeof value === "boolean") return ok(value ? "TRUE" : "FALSE");
  if (typeof value === "number" && Number.isFinite(value)) return ok(String(value));
  return err(`${JSON.stringify(value)} no es un valor simple`);
}
