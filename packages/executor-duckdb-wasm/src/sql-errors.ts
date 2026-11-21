import type { NodeError } from "@nodomics/protocol";

const MISSING_COLUMN = /Referenced column "([^"]+)" not found/;
const MISSING_QUALIFIED_COLUMN = /Values list "[^"]+" does not have a column named "([^"]+)"/;

/** Turns a DuckDB failure into a node error: the message is for the user, the detail for experts. */
export function toSqlNodeError(error: unknown): NodeError {
  const detail = error instanceof Error ? error.message : String(error);
  const column = MISSING_COLUMN.exec(detail)?.[1] ?? MISSING_QUALIFIED_COLUMN.exec(detail)?.[1];
  return column === undefined
    ? { code: "SQL_ERROR", message: "La consulta SQL no se pudo ejecutar.", detail }
    : { code: "COLUMN_NOT_FOUND", message: `La columna "${column}" no existe.`, detail };
}
