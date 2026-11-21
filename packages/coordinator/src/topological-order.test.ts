import { describe, expect, it } from "vitest";
import { toCatalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import type { FlatGraph } from "./flat-graph.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { topologicalOrder } from "./topological-order.ts";

const graphOf = (...args: Parameters<typeof flowOf>): FlatGraph => {
  const result = expandSubflows(flowOf(...args), toCatalog(coreCatalog));
  if (!result.ok) throw new Error("fixture flow must expand");
  return result.value;
};

describe("topologicalOrder", () => {
  it("orders every node after the nodes it reads from", () => {
    const graph = graphOf(
      [flowNode("c", "core.filter"), flowNode("b", "core.filter"), flowNode("a", "core.source")],
      [edge("b", "c"), edge("a", "b")],
    );

    expect(topologicalOrder(graph)).toEqual({ ok: true, value: ["a", "b", "c"] });
  });

  it("keeps the flow order between independent nodes", () => {
    const graph = graphOf([flowNode("x", "core.source"), flowNode("y", "core.source")], []);

    expect(topologicalOrder(graph)).toEqual({ ok: true, value: ["x", "y"] });
  });

  it("reports the nodes of a cycle as configuration issues", () => {
    const graph = graphOf(
      [flowNode("s", "core.source"), flowNode("a", "core.filter"), flowNode("b", "core.filter")],
      [edge("a", "b"), edge("b", "a")],
    );

    expect(topologicalOrder(graph)).toMatchObject({
      ok: false,
      error: [
        { nodeId: "a", code: "CYCLE" },
        { nodeId: "b", code: "CYCLE" },
      ],
    });
  });
});
