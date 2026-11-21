import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { createHarness } from "./testing/coordinator-harness.ts";

/** Python whose outputs and figure are declared in params; the fake executor returns "x" (number). */
const contractManifest: NodeManifest = {
  id: "core.python.contract",
  version: "0.1.0",
  name: "Python con contrato",
  category: "Python",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      columns: { type: "array", "x-nodomics": { widget: "port-schema", port: "out" } },
      mustShow: { type: "boolean", "x-nodomics": { widget: "switch", requires: "display" } },
    },
  },
  impl: { kind: "python", code: "def run(inputs, params):\n  return inputs", entry: "run" },
  requires: { runtime: "python", packages: ["pandas"] },
};

const harness = (pythonFiguresPerTask = 0) =>
  createHarness({
    catalog: [...coreCatalog, contractManifest],
    pythonFiguresPerTask,
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

const contractFlow = (params: Readonly<Record<string, unknown>>) =>
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("p", "core.python.contract", params),
      flowNode("f", "core.filter", { column: "total", value: "1" }),
    ],
    [edge("s", "p"), edge("p", "f")],
  );

const statusOf = (engine: ReturnType<typeof harness>, runId: string, nodeId: string) =>
  engine
    .events("node.status")
    .filter((status) => status.runId === runId && status.nodeId === nodeId)
    .at(-1);

describe("createCoordinator: output contracts", () => {
  it("accepts a result with the declared columns, extra columns included", async () => {
    const engine = harness();

    const runId = await engine.setAndRun(
      contractFlow({ columns: [{ name: "x", type: "number" }] }),
      1,
    );

    expect(statusOf(engine, runId, "p")?.state).toBe("done");
  });

  it("fails a node whose result lacks a declared column, and keeps nothing of it", async () => {
    const engine = harness();

    const runId = await engine.setAndRun(
      contractFlow({ columns: [{ name: "total", type: "number" }] }),
      1,
    );

    expect(statusOf(engine, runId, "p")).toMatchObject({
      state: "error",
      error: {
        code: "COLUMN_NOT_FOUND",
        message: 'El resultado no tiene la columna "total"',
        param: "columns",
      },
    });
    expect(engine.events("node.result").map((result) => result.nodeId)).not.toContain("p");
    // Only the copy of the source's table the node read stays on the Python executor.
    expect(engine.python.heldResultIds()).toHaveLength(1);
    expect(statusOf(engine, runId, "f")?.state).toBe("stale");
  });

  it("fails a node whose result has a declared column of another type", async () => {
    const engine = harness();

    const runId = await engine.setAndRun(
      contractFlow({ columns: [{ name: "x", type: "date" }] }),
      1,
    );

    expect(statusOf(engine, runId, "p")?.error).toEqual({
      code: "TYPE_MISMATCH",
      message: 'La columna "x" del resultado es número; se declaró fecha',
      param: "columns",
    });
  });

  it("fails a node that had to show a figure and showed none", async () => {
    const engine = harness(0);

    const runId = await engine.setAndRun(contractFlow({ mustShow: true }), 1);

    expect(statusOf(engine, runId, "p")?.error).toEqual({
      code: "TYPE_MISMATCH",
      message: "El nodo no mostró ningún gráfico",
      hint: "En Python, dibuja el gráfico y llama a plt.show()",
      param: "mustShow",
    });
  });

  it("accepts a node that had to show a figure and showed one", async () => {
    const engine = harness(1);

    const runId = await engine.setAndRun(contractFlow({ mustShow: true }), 1);

    expect(statusOf(engine, runId, "p")?.state).toBe("done");
  });

  it("infers the declared columns without running the node, also for the nodes after it", async () => {
    const engine = harness();
    await engine.coordinator["flow.set"]({
      rev: 1,
      flow: contractFlow({ columns: [{ name: "total", type: "number" }] }),
    });

    const declared = await engine.coordinator["schema.infer"]({ nodeId: "p", port: "out" });
    const after = await engine.coordinator["schema.infer"]({ nodeId: "f", port: "out" });

    expect(declared).toEqual({ ok: true, columns: [{ name: "total", type: "number" }] });
    expect(after.ok).toBe(true);
    const lastTask = engine.sql.tasks.at(-1);
    expect(lastTask?.kind === "sql" ? lastTask.query : "").toContain(
      'CAST(NULL AS DOUBLE) AS "total"',
    );
  });
});
