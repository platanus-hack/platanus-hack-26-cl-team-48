import type { NepResult } from "@nodomics/protocol";
import { columnIndex, type Cell, type Table } from "./table.ts";

const VEGA_LITE_SCHEMA = "https://vega.github.io/schema/vega-lite/v5.json";
const DEFAULT_CATEGORY = "region";
const DEFAULT_MEASURE = "unidades";

/** A Vega-Lite bar chart of `table`, summing the `y` column per value of the `x` column. */
export function buildBarView(
  table: Table,
  params: Readonly<Record<string, unknown>>,
): NepResult<"data.view"> {
  const x = typeof params["x"] === "string" ? params["x"] : DEFAULT_CATEGORY;
  const y = typeof params["y"] === "string" ? params["y"] : DEFAULT_MEASURE;
  const values = [...sumByCategory(table, { x, y })].map(([category, total]) => ({
    [x]: category,
    [y]: total,
  }));
  return {
    spec: {
      $schema: VEGA_LITE_SCHEMA,
      data: { values },
      mark: "bar",
      encoding: { x: { field: x, type: "nominal" }, y: { field: y, type: "quantitative" } },
    },
    rowCount: values.length,
    sampled: false,
  };
}

function sumByCategory(table: Table, axes: { x: string; y: string }): ReadonlyMap<Cell, number> {
  const xIndex = columnIndex(table, axes.x);
  const yIndex = columnIndex(table, axes.y);
  return table.rows.reduce((totals, row) => {
    const category = row[xIndex] ?? null;
    const measure = row[yIndex];
    return totals.set(
      category,
      (totals.get(category) ?? 0) + (typeof measure === "number" ? measure : 0),
    );
  }, new Map<Cell, number>());
}
