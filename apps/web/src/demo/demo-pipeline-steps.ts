import type { FlowNode } from "@nodomics/protocol";
import { step } from "./demo-pipelines.ts";

/* Short builders for the engine's core nodes, so each pipeline spec reads as a list of named steps. */

type Aggregation = readonly [
  column: string,
  fn: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT",
  name: string,
];
type CastTarget = "number" | "number-comma" | "text" | "date-iso" | "date-dmy";

export const src = (id: string, label: string, path: string): FlowNode =>
  step({ id, type: "core.source.csv", label }, { path });

export const join = (
  id: string,
  label: string,
  [leftColumn, rightColumn = leftColumn]: readonly [string, string?],
): FlowNode => step({ id, type: "core.join", label }, { leftColumn, rightColumn, how: "LEFT" });

export const cast = (
  id: string,
  label: string,
  conversions: ReadonlyArray<readonly [column: string, to: CastTarget]>,
): FlowNode =>
  step(
    { id, type: "core.cast", label },
    {
      conversions: conversions.map(([column, to]) => ({ column, to })),
    },
  );

export const formula = (
  id: string,
  label: string,
  [name, column, op, operand]: readonly [string, string, "+" | "-" | "*" | "/", string | number],
): FlowNode =>
  step(
    { id, type: "core.formula", label },
    {
      name,
      column,
      op,
      ...(typeof operand === "number" ? { value: operand } : { otherColumn: operand }),
    },
  );

export const filter = (
  id: string,
  label: string,
  [column, op, value]: readonly [string, "=" | "!=" | ">" | "<" | ">=" | "<=", string],
): FlowNode => step({ id, type: "core.filter", label }, { column, op, value });

export const group = (
  id: string,
  label: string,
  [groupBy, aggregations]: readonly [ReadonlyArray<string>, ReadonlyArray<Aggregation>],
): FlowNode =>
  step(
    { id, type: "core.group", label },
    {
      groupBy: [...groupBy],
      aggregations: aggregations.map(([column, fn, name]) => ({ column, fn, name })),
    },
  );

export const sort = (
  id: string,
  label: string,
  [column, direction = "DESC"]: readonly [string, ("ASC" | "DESC")?],
): FlowNode => step({ id, type: "core.sort", label }, { column, direction });

export const line = (
  id: string,
  label: string,
  [x, y, series]: readonly [string, string, string?],
): FlowNode =>
  step(
    { id, type: "core.view.line", label },
    { x, y, ...(series !== undefined ? { series } : {}) },
  );

export const bar = (id: string, label: string, [x, y]: readonly [string, string]): FlowNode =>
  step({ id, type: "core.view.bar", label }, { x, y, title: label });

const TABLE_ROWS = 50;

export const table = (id: string, label: string): FlowNode =>
  step({ id, type: "core.view.table", label }, { rows: TABLE_ROWS });
