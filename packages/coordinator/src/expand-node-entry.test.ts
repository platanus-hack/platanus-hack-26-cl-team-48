import type { FlowEdge, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { toCatalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const link = (from: [string, string], to: [string, string]): FlowEdge => ({
  id: `${from.join(".")}-${to.join(".")}`,
  from: { node: from[0], port: from[1] },
  to: { node: to[0], port: to[1] },
});

const ENTRY_PARAMS = {
  name: "Ventas filtradas",
  inputs: [{ name: "Ventas", type: "table" }],
  params: [{ id: "minimo", title: "Mínimo", node: "a", param: "value" }],
};

/** A flow used as a node: filters what arrives at "Ventas" by a value exposed as "minimo". */
const composite: NodeManifest = {
  id: "mine.ventas",
  version: "0.1.0",
  name: "Ventas filtradas",
  category: "Mis nodos",
  inputs: [{ id: "ventas", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: { minimo: { type: "string" } } },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("e", "flow.node", ENTRY_PARAMS),
        flowNode("a", "core.filter", { column: "x", value: "1" }),
        flowNode("o", "flow.output", { name: "out" }),
      ],
      edges: [link(["e", "ventas"], ["a", "in"]), edge("a", "o")],
    },
  },
};

const catalog = toCatalog([...coreCatalog, composite]);

describe("a node entry in the flow being edited", () => {
  it("is a node whose ports are the inputs it declares", () => {
    const flow = flowOf([flowNode("e", "flow.node", ENTRY_PARAMS)], []);

    const result = expandSubflows(flow, catalog);

    const port = { id: "ventas", name: "Ventas", type: "table" };
    expect(result).toMatchObject({
      ok: true,
      value: { nodes: [{ id: "e", manifest: { inputs: [port], outputs: [port] } }] },
    });
  });

  it("keeps the test data connected to it", () => {
    const flow = flowOf(
      [flowNode("s", "core.source"), flowNode("e", "flow.node", ENTRY_PARAMS)],
      [link(["s", "out"], ["e", "ventas"])],
    );

    const result = expandSubflows(flow, catalog);

    expect(result.ok && result.value.edges.map(({ to }) => to)).toEqual([
      { node: "e", port: "ventas" },
    ]);
  });
});

describe("a flow used as a node", () => {
  const flow = (params: Readonly<Record<string, unknown>> = {}) =>
    flowOf(
      [flowNode("s", "core.source"), flowNode("m", "mine.ventas", params)],
      [link(["s", "out"], ["m", "ventas"])],
    );

  it("connects each declared input to the nodes its entry feeds", () => {
    const result = expandSubflows(flow(), catalog);

    expect(result.ok && result.value.nodes.map(({ id }) => id)).toEqual(["s", "m.a"]);
    expect(result.ok && result.value.edges.map(({ from, to }) => [from.node, to.node])).toEqual([
      ["s", "m.a"],
    ]);
  });

  it("sets the inner param that a param of the node exposes", () => {
    const result = expandSubflows(flow({ minimo: "5" }), catalog);

    expect(result.ok && result.value.nodes[1]?.params).toEqual({ column: "x", value: "5" });
  });

  it("keeps the inner value of an exposed param the node leaves unset", () => {
    const result = expandSubflows(flow(), catalog);

    expect(result.ok && result.value.nodes[1]?.params).toEqual({ column: "x", value: "1" });
  });
});

describe("the ports of a flow used as a node", () => {
  const passThrough: NodeManifest = {
    ...composite,
    id: "mine.paso",
    outputs: [{ id: "mi_salida", name: "Mi Salida", type: "table" }],
    impl: {
      kind: "flow",
      graph: {
        nodes: [
          flowNode("e", "flow.node", ENTRY_PARAMS),
          flowNode("o", "flow.output", { name: "Mi Salida" }),
        ],
        edges: [link(["e", "ventas"], ["o", "in"])],
      },
    },
  };

  it("names an output by the port id of its name and passes an input straight to it", () => {
    const flow = flowOf(
      [flowNode("s", "core.source"), flowNode("m", "mine.paso"), flowNode("f", "core.filter")],
      [link(["s", "out"], ["m", "ventas"]), link(["m", "mi_salida"], ["f", "in"])],
    );

    const result = expandSubflows(flow, toCatalog([...coreCatalog, passThrough]));

    expect(result.ok && result.value.edges.map(({ from, to }) => [from.node, to.node])).toEqual([
      ["s", "f"],
    ]);
  });
});
