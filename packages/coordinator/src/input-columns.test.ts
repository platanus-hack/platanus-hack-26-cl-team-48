import type { Column, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import type { FlatNode } from "./flat-graph.ts";
import { applyInputColumns } from "./input-columns.ts";

const lineManifest: NodeManifest = {
  id: "core.line",
  version: "0.1.0",
  name: "Líneas",
  category: "Vistas",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: {
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["date", "number"] },
      },
      y: { type: "string", "x-nodomics": { widget: "column", of: "in", types: ["number"] } },
      series: { type: "string", "x-nodomics": { widget: "column", of: "in" } },
      timeUnit: {
        enum: ["yearmonth", "year"],
        "x-nodomics": { when: { param: "x", types: ["date"] } },
      },
    },
    required: ["x", "y"],
  },
  impl: { kind: "view", spec: {} },
};

const node = (params: Readonly<Record<string, unknown>>): FlatNode => ({
  id: "l",
  origin: "l",
  type: lineManifest.id,
  version: lineManifest.version,
  params,
  manifest: lineManifest,
});

const columns: ReadonlyArray<Column> = [
  { name: "fecha", type: "date" },
  { name: "unidades", type: "number" },
  { name: "region", type: "text" },
];

const withInput = (input: ReadonlyArray<Column> | undefined) => (port: string) =>
  port === "in" ? input : undefined;

describe("applyInputColumns", () => {
  it("keeps the params of columns that exist and have an accepted type", () => {
    const params = { x: "fecha", y: "unidades", series: "region", timeUnit: "year" };

    expect(applyInputColumns(node(params), withInput(columns))).toEqual({
      ok: true,
      value: node(params),
    });
  });

  it("reports a chosen column the input no longer has", () => {
    expect(applyInputColumns(node({ x: "fecha", y: "total" }), withInput(columns))).toMatchObject({
      ok: false,
      error: { code: "COLUMN_NOT_FOUND", param: "y", message: 'No existe la columna "total"' },
    });
  });

  it("reports a column whose type the param does not accept", () => {
    expect(
      applyInputColumns(node({ x: "region", y: "unidades" }), withInput(columns)),
    ).toMatchObject({
      ok: false,
      error: {
        code: "TYPE_MISMATCH",
        param: "x",
        message: 'La columna "region" es texto; aquí se espera fecha o número',
      },
    });
  });

  it("drops a param whose condition does not hold for the chosen column", () => {
    const applied = applyInputColumns(
      node({ x: "unidades", y: "unidades", timeUnit: "year" }),
      withInput(columns),
    );

    expect(applied.ok && applied.value.params).toEqual({ x: "unidades", y: "unidades" });
  });

  it("checks nothing while the input's columns are unknown", () => {
    const params = { x: "region", y: "nada", timeUnit: "year" };

    expect(applyInputColumns(node(params), withInput(undefined))).toEqual({
      ok: true,
      value: node(params),
    });
  });
});
