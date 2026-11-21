import { FLOW_FORMAT, type Flow, type NodeManifest, type PortSpec } from "@nodomics/protocol";

const port = (id: string, type: PortSpec["type"] = "table"): PortSpec => ({ id, type });

export const manifestOf = (id: string, overrides: Partial<NodeManifest> = {}): NodeManifest => ({
  id,
  version: "0.1.0",
  name: id,
  category: "Transformar",
  inputs: [port("in")],
  outputs: [port("out")],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "" },
  ...overrides,
});

export const SAMPLE = manifestOf("core.source.sample", {
  name: "Datos de ejemplo",
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: { dataset: { enum: ["ventas"], default: "ventas" } },
  },
});
export const FILTER = manifestOf("core.filter", {
  name: "Filtrar",
  description: "Conserva las filas que cumplen una condición.",
  params: {
    type: "object",
    properties: { op: { enum: ["=", ">"], default: "=" }, value: { type: "string" } },
  },
});
export const JOIN = manifestOf("core.join", {
  name: "Unir tablas",
  inputs: [port("left"), port("right")],
});
export const BAR = manifestOf("core.view.bar", {
  name: "Gráfico de barras",
  category: "Vistas",
  outputs: [port("out", "chart")],
  impl: { kind: "view", spec: {} },
});
export const PYTHON = manifestOf("core.python.zscore", {
  name: "Puntaje Z",
  category: "Python",
  impl: { kind: "python", code: "", entry: "run" },
});
export const FLOW_INPUT = manifestOf("flow.input", {
  category: "Flujo",
  inputs: [],
  outputs: [port("out", "any")],
  impl: { kind: "builtin", name: "flow.input" },
});

export const CATALOG: ReadonlyArray<NodeManifest> = [SAMPLE, FILTER, JOIN, BAR, PYTHON, FLOW_INPUT];

export const flowOf = (nodes: Flow["nodes"], edges: Flow["edges"] = []): Flow => ({
  format: FLOW_FORMAT,
  nodes,
  edges,
});

export const nodeOf = (id: string, type: string): Flow["nodes"][number] => ({
  id,
  type,
  version: "0.1.0",
  params: {},
  position: { x: 0, y: 0 },
});

export const edgeOf = (
  id: string,
  from: readonly [string, string],
  to: readonly [string, string],
): Flow["edges"][number] => ({
  id,
  from: { node: from[0], port: from[1] },
  to: { node: to[0], port: to[1] },
});
