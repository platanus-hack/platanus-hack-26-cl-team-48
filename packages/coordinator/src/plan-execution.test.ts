import type { ExecutorCapabilities, Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { toCatalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import { planExecution } from "./plan-execution.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const sqlExecutor: ExecutorCapabilities = { executor: "sql", runtimes: ["sql"] };
const pythonExecutor: ExecutorCapabilities = {
  executor: "py",
  runtimes: ["python"],
  packages: ["pandas"],
};

const plan = (flow: Flow, stale: string[], executors = [sqlExecutor, pythonExecutor]) => {
  const graph = expandSubflows(flow, toCatalog(coreCatalog));
  if (!graph.ok) throw new Error("fixture flow must expand");
  return planExecution(graph.value, stale, executors);
};

const sourceThenFilter = flowOf(
  [
    flowNode("s", "core.source", { sourceId: "src_1" }),
    flowNode("f", "core.filter", { column: "a", op: "=", value: "1" }),
  ],
  [edge("s", "f")],
);

describe("planExecution", () => {
  it("renders SQL nodes into tasks whose inputs point at sources and upstream ports", () => {
    expect(plan(sourceThenFilter, ["s", "f"])).toEqual([
      {
        nodeId: "s",
        outcome: {
          ok: true,
          value: {
            executor: 0,
            task: {
              kind: "sql",
              query: 'SELECT * FROM "source_src_1"',
              inputs: { source_src_1: { kind: "source", sourceId: "src_1" } },
            },
          },
        },
      },
      {
        nodeId: "f",
        outcome: {
          ok: true,
          value: {
            executor: 0,
            task: {
              kind: "sql",
              query: `SELECT * FROM "in" WHERE "a" = '1'`,
              inputs: { in: { kind: "node", node: "s", port: "out" } },
            },
          },
        },
      },
    ]);
  });

  it("plans only the stale nodes", () => {
    expect(plan(sourceThenFilter, ["f"]).map((step) => step.nodeId)).toEqual(["f"]);
  });

  it("sends Python nodes to an executor with Python and the required packages", () => {
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("p", "core.python", { k: 1 })],
      [edge("s", "p")],
    );

    expect(plan(flow, ["p"])[0]?.outcome).toEqual({
      ok: true,
      value: {
        executor: 1,
        task: {
          kind: "python",
          code: "def run(inputs, params):\n  return inputs",
          entry: "run",
          params: { k: 1 },
          inputs: { in: { kind: "node", node: "s", port: "out" } },
        },
      },
    });
  });

  it("plans a view node as a display step on a SQL executor", () => {
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("v", "core.chart")],
      [edge("s", "v")],
    );

    expect(plan(flow, ["v"])[0]?.outcome).toEqual({
      ok: true,
      value: {
        executor: 0,
        task: { kind: "view", inputs: { in: { kind: "node", node: "s", port: "out" } } },
      },
    });
  });

  it("turns invalid params into a node error instead of a task", () => {
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("f", "core.filter", {})],
      [edge("s", "f")],
    );

    expect(plan(flow, ["f"])[0]?.outcome).toMatchObject({
      ok: false,
      error: { code: "PARAM_REQUIRED", param: "column" },
    });
  });

  it("turns an unconnected required input into INPUT_MISSING", () => {
    const flow = flowOf([flowNode("f", "core.filter", { column: "a", value: "1" })], []);

    expect(plan(flow, ["f"])[0]?.outcome).toMatchObject({
      ok: false,
      error: { code: "INPUT_MISSING" },
    });
  });

  it("turns a node no executor can run into RUNTIME_UNAVAILABLE", () => {
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("p", "core.python")],
      [edge("s", "p")],
    );

    expect(plan(flow, ["p"], [sqlExecutor])[0]?.outcome).toMatchObject({
      ok: false,
      error: { code: "RUNTIME_UNAVAILABLE" },
    });
  });
});
