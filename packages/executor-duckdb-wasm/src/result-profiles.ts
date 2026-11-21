import type { Table } from "apache-arrow";
import type { Column, ColumnProfile, ColumnType, DataProfile } from "@nodomics/protocol";
import { readColumns, requireResult, type ResultTables } from "./result-tables.ts";
import { quoteIdentifier } from "./sql-identifiers.ts";

const HISTOGRAM_BINS = 10;
const RANGED_TYPES: ReadonlySet<ColumnType> = new Set(["number", "text", "date"]);

type ColumnStats = {
  readonly count: number;
  readonly nulls: number;
  readonly distinct: number;
  readonly min: unknown;
  readonly max: unknown;
  readonly mean: unknown;
};

export async function profileResult(tables: ResultTables, resultId: string): Promise<DataProfile> {
  const source = requireResult(tables, resultId);
  const columns = await readColumns(tables, resultId);
  return {
    columns: await Promise.all(columns.map((column) => profileColumn(tables, source, column))),
  };
}

async function profileColumn(
  tables: ResultTables,
  source: string,
  column: Column,
): Promise<ColumnProfile> {
  const stats = readStats(await tables.connection.query(buildStatsQuery(source, column)));
  return {
    name: column.name,
    type: column.type,
    count: stats.count,
    nulls: stats.nulls,
    distinct: stats.distinct,
    ...optionalText("min", stats.min),
    ...optionalText("max", stats.max),
    ...(typeof stats.mean === "number" ? { mean: stats.mean } : {}),
    bins: column.type === "number" ? await readHistogram(tables, { source, column }, stats) : [],
  };
}

function buildStatsQuery(source: string, column: Column): string {
  const name = quoteIdentifier(column.name);
  const isRanged = RANGED_TYPES.has(column.type);
  return `SELECT count(*)::DOUBLE AS "count",
    (count(*) - count(${name}))::DOUBLE AS "nulls",
    count(DISTINCT ${name})::DOUBLE AS "distinct",
    ${isRanged ? `CAST(min(${name}) AS VARCHAR)` : "NULL"} AS "min",
    ${isRanged ? `CAST(max(${name}) AS VARCHAR)` : "NULL"} AS "max",
    ${column.type === "number" ? `avg(${name})::DOUBLE` : "NULL"} AS "mean"
    FROM ${source}`;
}

function readStats(table: Table): ColumnStats {
  const cell = (name: string): unknown => table.getChild(name)?.get(0);
  return {
    count: Number(cell("count")),
    nulls: Number(cell("nulls")),
    distinct: Number(cell("distinct")),
    min: cell("min"),
    max: cell("max"),
    mean: cell("mean"),
  };
}

const optionalText = (key: "min" | "max", value: unknown) =>
  typeof value === "string" ? { [key]: value } : {};

/** Equal-width bins between min and max; a single bin when every value is the same. */
async function readHistogram(
  tables: ResultTables,
  target: { readonly source: string; readonly column: Column },
  stats: ColumnStats,
): Promise<number[]> {
  const values = stats.count - stats.nulls;
  if (values === 0) return [];
  if (stats.distinct === 1) return [values];
  const table = await tables.connection.query(buildHistogramQuery(target.source, target.column));
  const bins = Array<number>(HISTOGRAM_BINS).fill(0);
  Array.from({ length: table.numRows }).forEach((_, row) => {
    bins[Number(table.getChild("bin")?.get(row))] = Number(table.getChild("n")?.get(row));
  });
  return bins;
}

function buildHistogramQuery(source: string, column: Column): string {
  const name = quoteIdentifier(column.name);
  const last = String(HISTOGRAM_BINS - 1);
  return `SELECT LEAST(FLOOR((${name} - lo) / (hi - lo) * ${String(HISTOGRAM_BINS)}), ${last})::INTEGER AS bin,
    count(*)::DOUBLE AS n
    FROM ${source}, (SELECT min(${name})::DOUBLE AS lo, max(${name})::DOUBLE AS hi FROM ${source})
    WHERE ${name} IS NOT NULL GROUP BY bin`;
}
