import { describe, expect, it } from "vitest";
import { analyzeFlow } from "./analyze-flow.ts";
import { toCatalog } from "./catalog.ts";
import { coreCatalog, edge, filterManifest, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const catalog = toCatalog(coreCatalog);

const filterFlow = (params: Record<string, unknown>) =>
  flowOf(
    [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("f", "core.filter", params)],
    [edge("s", "f")],
  );

describe("analyzeFlow", () => {
  it("fills param defaults, so an omitted default and an explicit one share a key", () => {
    const implicit = analyzeFlow(filterFlow({ column: "a", value: "1" }), catalog);

    const explicit = analyzeFlow(filterFlow({ column: "a", op: "=", value: "1" }), catalog);

    expect(implicit.keys.get("f")).toBe(explicit.keys.get("f"));
    expect(implicit.graph.nodes[1]?.params).toEqual({ column: "a", op: "=", value: "1" });
  });

  it("treats a param cleared to null as one without value, which gets no default", () => {
    const cleared = analyzeFlow(filterFlow({ column: "a", op: null, value: "1" }), catalog);

    expect(cleared.graph.nodes[1]?.params).toEqual({ column: "a", value: "1" });
    expect(cleared.issues).toEqual([]);
  });

  it("lists the configuration issues of every node", () => {
    expect(analyzeFlow(filterFlow({}), catalog).issues).toMatchObject([
      { nodeId: "f", code: "PARAM_REQUIRED", param: "column" },
      { nodeId: "f", code: "PARAM_REQUIRED", param: "value" },
    ]);
  });

  it("uses the custom nodes that travel with the flow", () => {
    const flow = {
      ...flowOf([flowNode("x", "custom.filter", { column: "a", value: "1" })], []),
      customNodes: [{ ...filterManifest, id: "custom.filter", inputs: [] }],
    };

    expect(analyzeFlow(flow, catalog)).toMatchObject({
      issues: [],
      graph: { nodes: [{ id: "x" }] },
    });
  });

  it("returns no runnable graph when a node type is unknown", () => {
    const analysis = analyzeFlow(flowOf([flowNode("x", "core.unknown")], []), catalog);

    expect(analysis).toMatchObject({
      graph: { nodes: [] },
      issues: [{ nodeId: "x", code: "UNKNOWN_NODE_TYPE" }],
    });
  });

  it("keys no node when the flow has a cycle", () => {
    const flow = flowOf(
      [
        flowNode("a", "core.filter", { column: "a", value: "1" }),
        flowNode("b", "core.filter", { column: "a", value: "1" }),
      ],
      [edge("a", "b"), edge("b", "a")],
    );

    const analysis = analyzeFlow(flow, catalog);

    expect(analysis.keys.size).toBe(0);
    expect(analysis.issues.map((issue) => issue.nodeId)).toEqual(["a", "b"]);
  });
});
