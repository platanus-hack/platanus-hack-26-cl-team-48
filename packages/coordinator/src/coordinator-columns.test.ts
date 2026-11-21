import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";

/** Picks a date column; the fake executor's tables only have the number column "x". */
const pickDateManifest: NodeManifest = {
  id: "core.pick-date",
  version: "0.1.0",
  name: "Elegir fecha",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { type: "string", "x-nodomics": { widget: "column", of: "in", types: ["date"] } },
    },
    required: ["column"],
  },
  impl: { kind: "sql", template: "SELECT {{ident column}} FROM {{in}}" },
};

/** Groups dates only when its X column is a date, like the line chart. */
const timeChartManifest: NodeManifest = {
  id: "core.time-chart",
  version: "0.1.0",
  name: "Líneas",
  category: "Vistas",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: { type: "string", "x-nodomics": { widget: "column", of: "in" } },
      timeUnit: {
        enum: ["yearmonth"],
        default: "yearmonth",
        "x-nodomics": { when: { param: "x", types: ["date"] } },
      },
    },
  },
  impl: {
    kind: "view",
    spec: {
      encoding: { x: { field: "{{x}}", type: "{{vegaType x}}", timeUnit: "utc{{timeUnit}}" } },
    },
  },
};

const harness = () =>
  createHarness({
    catalog: [...coreCatalog, pickDateManifest, timeChartManifest],
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

const pickFlow = (column: string) =>
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("d", "core.pick-date", { column }),
    ],
    [edge("s", "d")],
  );

const errorOf = (engine: ReturnType<typeof harness>, runId: string, nodeId: string) =>
  engine
    .events("node.status")
    .find(
      (status) => status.runId === runId && status.nodeId === nodeId && status.state === "error",
    )?.error;

describe("createCoordinator: columns chosen in params", () => {
  it("fails a node whose chosen column has a type its param does not accept", async () => {
    const engine = harness();

    const runId = await engine.setAndRun(pickFlow("x"), 1);

    expect(errorOf(engine, runId, "d")).toEqual({
      code: "TYPE_MISMATCH",
      message: 'La columna "x" es número; aquí se espera fecha',
      param: "column",
    });
    expect(engine.sql.tasks).toHaveLength(1);
  });

  it("fails a node whose chosen column its input does not have", async () => {
    const engine = harness();

    const runId = await engine.setAndRun(pickFlow("fecha"), 1);

    expect(errorOf(engine, runId, "d")).toMatchObject({
      code: "COLUMN_NOT_FOUND",
      param: "column",
    });
  });

  it("draws a view without the params that do not apply to its columns", async () => {
    const engine = harness();
    await engine.setAndRun(
      flowOf(
        [
          flowNode("s", "core.source", { sourceId: "src_1" }),
          flowNode("v", "core.time-chart", { x: "x" }),
        ],
        [edge("s", "v")],
      ),
      1,
    );

    const view = await engine.coordinator["data.view"]({ nodeId: "v" });

    expect(view.spec).toMatchObject({ encoding: { x: { field: "x", type: "quantitative" } } });
    expect(view.spec).not.toHaveProperty("encoding.x.timeUnit");
  });
});
