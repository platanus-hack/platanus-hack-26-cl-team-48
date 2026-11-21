import { describe, expect, it } from "vitest";
import { Flow } from "./flow.ts";
import { parse } from "./parse.ts";

const sourceNode = {
  id: "n1",
  type: "core.source.url",
  version: "0.1.0",
  params: { url: "/datasets/ventas.csv" },
  position: { x: 0, y: 0 },
};
const filterNode = { ...sourceNode, id: "n2", type: "core.filter", params: { column: "region" } };
const validFlow = {
  format: "nodomics/flow@0",
  nodes: [sourceNode, filterNode],
  edges: [{ id: "e1", from: { node: "n1", port: "out" }, to: { node: "n2", port: "in" } }],
};

describe("Flow", () => {
  it("accepts a flow with nodes and edges", () => {
    expect(parse(Flow, validFlow).ok).toBe(true);
  });

  it("accepts custom nodes defined by the user inside the flow", () => {
    const customNode = {
      id: "user.sales-south",
      version: "0.1.0",
      name: "Ventas del Sur",
      category: "Mis nodos",
      inputs: [{ id: "in", type: "table" }],
      outputs: [{ id: "out", type: "table" }],
      params: { type: "object", properties: {} },
      impl: { kind: "flow", graph: { nodes: [filterNode], edges: [] } },
    };

    expect(parse(Flow, { ...validFlow, customNodes: [customNode] }).ok).toBe(true);
  });

  it("rejects an unknown format version", () => {
    expect(parse(Flow, { ...validFlow, format: "nodomics/flow@9" }).ok).toBe(false);
  });

  it("rejects an edge without a port", () => {
    const edges = [{ id: "e1", from: { node: "n1" }, to: { node: "n2", port: "in" } }];

    expect(parse(Flow, { ...validFlow, edges }).ok).toBe(false);
  });

  it("rejects node ids with characters outside the allowed set", () => {
    expect(parse(Flow, { ...validFlow, nodes: [{ ...sourceNode, id: "n 1" }] }).ok).toBe(false);
  });
});
