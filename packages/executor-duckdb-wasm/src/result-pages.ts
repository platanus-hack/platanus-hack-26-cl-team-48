import type { Table } from "apache-arrow";
import type { Column, ColumnType, DataPage, ExecutorParams, SortSpec } from "@nodomics/protocol";
import { countRows, readColumns, requireResult, type ResultTables } from "./result-tables.ts";
import { quoteIdentifier } from "./sql-identifiers.ts";

/**
 * Pages travel as JSON, so every value is cast in SQL to something JSON keeps intact:
 * BIGINT and DECIMAL arrive from Arrow as bigint or scaled integers, dates as epoch numbers.
 */
const JSON_PROJECTIONS: Readonly<Record<ColumnType, (column: string) => string>> = {
  number: (column) => `CAST(${column} AS DOUBLE) AS ${column}`,
  text: (column) => column,
  bool: (column) => column,
  date: (column) => `CAST(${column} AS VARCHAR) AS ${column}`,
  geo: (column) => `CAST(${column} AS VARCHAR) AS ${column}`,
  other: (column) => `CAST(${column} AS VARCHAR) AS ${column}`,
};

export async function readPage(
  tables: ResultTables,
  window: ExecutorParams<"exec.page">,
): Promise<DataPage> {
  const columns = await readColumns(tables, window.resultId);
  const table = await tables.connection.query(buildPageQuery(tables, columns, window));
  return {
    columns,
    rows: readRows(table, columns),
    total: await countRows(tables.connection, window.resultId),
  };
}

function buildPageQuery(
  tables: ResultTables,
  columns: readonly Column[],
  window: ExecutorParams<"exec.page">,
): string {
  const projection = columns
    .map((column) => JSON_PROJECTIONS[column.type](quoteIdentifier(column.name)))
    .join(", ");
  return [
    `SELECT ${projection} FROM ${requireResult(tables, window.resultId)}`,
    window.sort === undefined ? "" : orderBy(window.sort),
    `LIMIT ${String(window.limit)} OFFSET ${String(window.offset)}`,
  ].join(" ");
}

const orderBy = (sort: SortSpec): string =>
  `ORDER BY ${quoteIdentifier(sort.column)} ${sort.direction === "asc" ? "ASC" : "DESC"} NULLS LAST`;

const readRows = (table: Table, columns: readonly Column[]): unknown[][] =>
  Array.from({ length: table.numRows }, (_, row) =>
    columns.map((column): unknown => table.getChild(column.name)?.get(row) ?? null),
  );
