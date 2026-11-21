import { createHarness } from "./testing/coordinator-harness.ts";
import { describe, expect, it } from "vitest";
import { analyzeFlow } from "./analyze-flow.ts";
import { toCatalog } from "./catalog.ts";
import { buildInferQuery } from "./infer-query.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const { graph } = analyzeFlow(
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("f", "core.filter", { column: "a", value: "1" }),
      flowNode("p", "core.python"),
      flowNode("g", "core.filter", { column: "b", value: "2" }),
    ],
    [edge("s", "f"), edge("s", "p"), edge("p", "g")],
  ),
  toCatalog(coreCatalog),
);

describe("buildInferQuery", () => {
  it("chains the SQL of uncached upstream nodes as CTEs and selects no rows", () => {
    expect(buildInferQuery(graph, "f", () => false)).toEqual({
      ok: true,
      value: {
        query:
          'WITH "node_s" AS (SELECT * FROM "source_src_1"), ' +
          `"node_f" AS (SELECT * FROM "node_s" WHERE "a" = '1') ` +
          'SELECT * FROM "node_f" LIMIT 0',
        inputs: { source_src_1: { kind: "source", sourceId: "src_1" } },
      },
    });
  });

  it("reads cached upstream results instead of recomputing them", () => {
    expect(buildInferQuery(graph, "f", (nodeId) => nodeId === "s")).toEqual({
      ok: true,
      value: {
        query: `WITH "node_f" AS (SELECT * FROM "result_s_out" WHERE "a" = '1') SELECT * FROM "node_f" LIMIT 0`,
        inputs: { result_s_out: { kind: "node", node: "s", port: "out" } },
      },
    });
  });

  it("asks to run the flow when an uncached upstream node is not SQL", () => {
    expect(buildInferQuery(graph, "g", () => false)).toMatchObject({
      ok: false,
      error: { code: "INPUT_MISSING" },
    });
  });

  it("reports the configuration issue of a node on the way", () => {
    const flow = analyzeFlow(
      flowOf([flowNode("s", "core.source", {})], []),
      toCatalog(coreCatalog),
    );

    expect(buildInferQuery(flow.graph, "s", () => false)).toMatchObject({
      ok: false,
      error: { code: "PARAM_REQUIRED" },
    });
  });
});

it("returns CYCLE when inference traverses a SQL cycle", () => {
  const { graph } = analyzeFlow(
    flowOf(
      [
        flowNode("a", "core.filter", { column: "x", value: "1" }),
        flowNode("b", "core.filter", { column: "x", value: "2" }),
      ],
      [edge("a", "b"), edge("b", "a")],
    ),
    toCatalog(coreCatalog),
  );
  expect(buildInferQuery(graph, "a", () => false)).toMatchObject({
    ok: false,
    error: { code: "CYCLE" },
  });
});

it("returns a domain cycle error through schema.infer without executing SQL", async () => {
  const harness = createHarness();
  await harness.coordinator["flow.set"]({
    rev: 1,
    flow: flowOf(
      [
        flowNode("a", "core.filter", { column: "x", value: "1" }),
        flowNode("b", "core.filter", { column: "x", value: "2" }),
      ],
      [edge("a", "b"), edge("b", "a")],
    ),
  });

  await expect(
    harness.coordinator["schema.infer"]({ nodeId: "a", port: "out" }),
  ).resolves.toMatchObject({ ok: false, error: { code: "CYCLE" } });
  expect(harness.sql.tasks).toEqual([]);
});
