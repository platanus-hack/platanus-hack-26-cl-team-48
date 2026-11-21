import type { FlowNode, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { CATALOG, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { nodeFromFlow } from "./flow-node.ts";

const ENTRY = manifestOf("flow.node", {
  category: "Flujo",
  inputs: [],
  outputs: [],
  params: {
    type: "object",
    properties: {
      name: { type: "string" },
      inputs: { type: "array", "x-nodomics": { widget: "ports" } },
      params: { type: "array", "x-nodomics": { widget: "node-params" } },
    },
  },
  impl: { kind: "builtin", name: "flow.node" },
});
const OUTPUT = manifestOf("flow.output", {
  category: "Flujo",
  inputs: [{ id: "in", type: "any" }],
  outputs: [],
  impl: { kind: "builtin", name: "flow.output" },
});
const SELECT = manifestOf("core.select", {
  params: {
    type: "object",
    properties: {
      column: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      limit: { title: "Límite", type: "integer", minimum: 1 },
    },
  },
});

const catalog: ReadonlyArray<NodeManifest> = [...CATALOG, ENTRY, OUTPUT, SELECT];

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const ENTRY_PARAMS = {
  name: "Ventas altas",
  description: "Filtra las ventas grandes.",
  inputs: [{ name: "Ventas", type: "table" }],
  params: [
    { id: "minimo", title: "Mínimo", node: "f", param: "value" },
    { id: "columna", title: "Columna", node: "c", param: "column" },
  ],
};

/** sample → entry(ventas) → filter f → select c → output "Resultado"; plus a stray chart. */
const flow = (entryParams: FlowNode["params"] = ENTRY_PARAMS) =>
  flowOf(
    [
      nodeOf("s", "core.source.sample"),
      withParams(nodeOf("e", "flow.node"), entryParams),
      withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" }),
      withParams(nodeOf("c", "core.select"), { column: "total" }),
      withParams(nodeOf("o", "flow.output"), { name: "Resultado" }),
      nodeOf("b", "core.view.bar"),
    ],
    [
      edgeOf("test", ["s", "out"], ["e", "ventas"]),
      edgeOf("e-f", ["e", "ventas"], ["f", "in"]),
      edgeOf("f-c", ["f", "out"], ["c", "in"]),
      edgeOf("c-o", ["c", "out"], ["o", "in"]),
      edgeOf("f-b", ["f", "out"], ["b", "in"]),
    ],
  );

const build = (saved = flow()) =>
  nodeFromFlow({ id: "f1", version: "0.1.3", flow: saved }, catalog);

describe("nodeFromFlow", () => {
  it("names the node and its ports after its entry and outputs", () => {
    expect(build()).toMatchObject({
      ok: true,
      value: {
        id: "mine.f1",
        version: "0.1.3",
        name: "Ventas altas",
        description: "Filtra las ventas grandes.",
        category: "Mis nodos",
        inputs: [{ id: "ventas", name: "Ventas", type: "table" }],
        outputs: [{ id: "resultado", name: "Resultado", type: "table" }],
      },
    });
  });

  it("keeps only the nodes the outputs depend on, without the test data", () => {
    const manifest = build();

    expect(
      manifest.ok && manifest.value.impl.kind === "flow"
        ? {
            nodes: manifest.value.impl.graph.nodes.map(({ id }) => id),
            edges: manifest.value.impl.graph.edges.map(({ id }) => id),
          }
        : undefined,
    ).toEqual({ nodes: ["e", "f", "c", "o"], edges: ["e-f", "f-c", "c-o"] });
  });

  it("exposes params with the inner schema, the chosen title and the current value", () => {
    const manifest = build();

    expect(manifest.ok && manifest.value.params).toEqual({
      type: "object",
      properties: {
        minimo: { title: "Mínimo", type: "string", default: "10" },
        columna: { title: "Columna", type: "string", default: "total" },
      },
    });
  });

  it("points a column param at the node's input when the entry feeds that port", () => {
    const fedByEntry = flow();
    const direct = {
      ...fedByEntry,
      edges: fedByEntry.edges.map((edge) =>
        edge.id === "f-c" ? edgeOf("e-c", ["e", "ventas"], ["c", "in"]) : edge,
      ),
    };

    const manifest = build(direct);

    expect(manifest.ok && manifest.value.params.properties["columna"]).toEqual({
      title: "Columna",
      type: "string",
      default: "total",
      "x-nodomics": { widget: "column", of: "ventas" },
    });
  });

  it("falls back to the node id for an output name without letters", () => {
    const saved = flow();
    const result = build({
      ...saved,
      nodes: saved.nodes.map((node) =>
        node.id === "o" ? { ...node, params: { name: "¿?" } } : node,
      ),
    });
    expect(result.ok && result.value.outputs[0]?.id).toBe("o");
  });
  it.each([["A", "Á"], ["¿?"]])("rejects unusable input names %s", (...names) => {
    expect(
      build(flow({ ...ENTRY_PARAMS, inputs: names.map((name) => ({ name, type: "table" })) })),
    ).toEqual({ ok: false, error: "repeated-inputs" });
  });
  it.each([
    ["no-entry", flowOf([nodeOf("s", "core.source.sample")])],
    ["no-name", flow({ ...ENTRY_PARAMS, name: "  " })],
    ["no-outputs", flowOf([withParams(nodeOf("e", "flow.node"), ENTRY_PARAMS)], [])],
    [
      "many-entries",
      flowOf([...flow().nodes, withParams(nodeOf("e2", "flow.node"), ENTRY_PARAMS)], flow().edges),
    ],
    [
      "repeated-outputs",
      flowOf(
        [...flow().nodes, withParams(nodeOf("o2", "flow.output"), { name: "resultado" })],
        [...flow().edges, edgeOf("f-o2", ["f", "out"], ["o2", "in"])],
      ),
    ],
    ["uses-itself", flowOf([...flow().nodes, nodeOf("me", "mine.f1")], flow().edges)],
  ])("refuses a flow with %s", (issue, saved) => {
    expect(build(saved)).toEqual({ ok: false, error: issue });
  });
});
