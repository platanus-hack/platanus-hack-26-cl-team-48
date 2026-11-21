import { FLOW_FORMAT, type Flow, type FlowNode, type NodeManifest } from "@nodomics/protocol";

const tablePort = (id: string) => ({ id, type: "table" as const });

export const sourceManifest: NodeManifest = {
  id: "core.source",
  version: "0.1.0",
  name: "Fuente",
  category: "Fuentes",
  inputs: [],
  outputs: [tablePort("out")],
  params: {
    type: "object",
    properties: { sourceId: { type: "string" } },
    required: ["sourceId"],
  },
  impl: { kind: "sql", template: "SELECT * FROM {{source sourceId}}" },
};

export const filterManifest: NodeManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [tablePort("in")],
  outputs: [tablePort("out")],
  params: {
    type: "object",
    properties: {
      column: { type: "string" },
      op: { enum: ["=", "!=", ">", "<"], default: "=" },
      value: { type: "string" },
    },
    required: ["column", "value"],
  },
  impl: {
    kind: "sql",
    template: "SELECT * FROM {{in}} WHERE {{ident column}} {{op}} {{lit value}}",
  },
};

export const pythonManifest: NodeManifest = {
  id: "core.python",
  version: "0.1.0",
  name: "Python",
  category: "Código",
  inputs: [tablePort("in")],
  outputs: [tablePort("out")],
  params: { type: "object", properties: {} },
  impl: { kind: "python", code: "def run(inputs, params):\n  return inputs", entry: "run" },
  requires: { runtime: "python", packages: ["pandas"] },
};

export const chartManifest: NodeManifest = {
  id: "core.chart",
  version: "0.1.0",
  name: "Gráfico",
  category: "Vistas",
  inputs: [tablePort("in")],
  outputs: [{ id: "out", type: "chart" }],
  params: { type: "object", properties: { x: { type: "string", default: "x" } } },
  impl: { kind: "view", spec: { mark: "bar", encoding: { x: { field: "{{x}}" } } } },
};

export const sampleSourceManifest: NodeManifest = {
  id: "core.source.sample",
  version: "0.1.0",
  name: "Datos de ejemplo",
  category: "Fuentes",
  inputs: [],
  outputs: [tablePort("out")],
  params: { type: "object", properties: { dataset: { enum: ["ventas"], default: "ventas" } } },
  impl: { kind: "sql", template: "SELECT * FROM {{source (concat 'sample.' dataset)}}" },
};

export const flowInputManifest: NodeManifest = {
  id: "flow.input",
  version: "0.1.0",
  name: "Entrada",
  category: "Flujo",
  inputs: [],
  outputs: [tablePort("out")],
  params: { type: "object", properties: { name: { type: "string" } } },
  impl: { kind: "builtin", name: "flow.input" },
};

export const flowOutputManifest: NodeManifest = {
  id: "flow.output",
  version: "0.1.0",
  name: "Salida",
  category: "Flujo",
  inputs: [tablePort("in")],
  outputs: [],
  params: { type: "object", properties: { name: { type: "string" } } },
  impl: { kind: "builtin", name: "flow.output" },
};

export const nodeEntryManifest: NodeManifest = {
  id: "flow.node",
  version: "0.1.0",
  name: "Entrada de nodo",
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
};

export const flowNode = (
  id: string,
  type: string,
  params: Readonly<Record<string, unknown>> = {},
): FlowNode => ({ id, type, version: "0.1.0", params: { ...params }, position: { x: 0, y: 0 } });

export const edge = (from: string, to: string, toPort = "in") => ({
  id: `${from}-${to}-${toPort}`,
  from: { node: from, port: "out" },
  to: { node: to, port: toPort },
});

/** A composite node that filters its input twice through an inner flow. */
export const doubleFilterManifest: NodeManifest = {
  id: "core.double-filter",
  version: "0.1.0",
  name: "Doble filtro",
  category: "Transformar",
  inputs: [tablePort("in")],
  outputs: [tablePort("out")],
  params: { type: "object", properties: {} },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("i", "flow.input", { name: "in" }),
        flowNode("a", "core.filter", { column: "x", value: "1" }),
        flowNode("b", "core.filter", { column: "y", value: "2" }),
        flowNode("o", "flow.output", { name: "out" }),
      ],
      edges: [edge("i", "a"), edge("a", "b"), edge("b", "o")],
    },
  },
};

export const coreCatalog: ReadonlyArray<NodeManifest> = [
  sourceManifest,
  sampleSourceManifest,
  filterManifest,
  pythonManifest,
  chartManifest,
  flowInputManifest,
  flowOutputManifest,
  nodeEntryManifest,
  doubleFilterManifest,
];

export const flowOf = (nodes: FlowNode[], edges: Flow["edges"]): Flow => ({
  format: FLOW_FORMAT,
  nodes,
  edges,
});
