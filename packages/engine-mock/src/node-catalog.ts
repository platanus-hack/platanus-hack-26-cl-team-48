import type { NodeManifest } from "@nodomics/protocol";

const VERSION = "0.1.0";

const TABLE_IN = [{ id: "in", type: "table" }] as const satisfies NodeManifest["inputs"];
const TABLE_OUT = [{ id: "out", type: "table" }] as const satisfies NodeManifest["outputs"];

const columnOf = (port: string) => ({
  type: "string",
  "x-nodomics": { widget: "column", of: port },
});

const ZSCORE_CODE = `def run(inputs, params):
    df = inputs["in"].copy()
    column = params["column"]
    df[column + "_z"] = (df[column] - df[column].mean()) / df[column].std()
    return {"out": df}
`;

/** The fixed catalog every mock session starts with. */
export const MOCK_NODES: readonly NodeManifest[] = [
  {
    id: "core.source.csv",
    version: VERSION,
    name: "CSV",
    category: "Fuentes",
    inputs: [],
    outputs: [...TABLE_OUT],
    params: {
      type: "object",
      properties: { sourceId: { type: "string", "x-nodomics": { widget: "source" } } },
      required: ["sourceId"],
    },
    impl: { kind: "sql", template: "SELECT * FROM {{source sourceId}}" },
  },
  {
    id: "core.filter",
    version: VERSION,
    name: "Filtrar",
    category: "Transformar",
    inputs: [...TABLE_IN],
    outputs: [...TABLE_OUT],
    params: {
      type: "object",
      properties: {
        column: columnOf("in"),
        op: { enum: ["=", "!=", ">", "<", ">=", "<=", "contiene"], default: "=" },
        value: { type: "string" },
      },
      required: ["column", "value"],
    },
    impl: {
      kind: "sql",
      template:
        "SELECT * FROM {{in}} WHERE {{#if (eq op 'contiene')}}CAST({{ident column}} AS VARCHAR) ILIKE {{lit (concat '%' value '%')}}{{else}}{{ident column}} {{op}} {{lit value}}{{/if}}",
    },
  },
  {
    id: "core.group",
    version: VERSION,
    name: "Agrupar",
    category: "Transformar",
    inputs: [...TABLE_IN],
    outputs: [...TABLE_OUT],
    params: {
      type: "object",
      properties: {
        by: columnOf("in"),
        measure: columnOf("in"),
        agg: { enum: ["sum", "avg", "count", "min", "max"], default: "sum" },
      },
      required: ["by", "measure"],
    },
    impl: {
      kind: "sql",
      template:
        "SELECT {{ident by}}, {{agg}}({{ident measure}}) AS {{ident measure}} FROM {{in}} GROUP BY {{ident by}}",
    },
  },
  {
    id: "core.python.zscore",
    version: VERSION,
    name: "Puntaje z",
    category: "Python",
    inputs: [...TABLE_IN],
    outputs: [...TABLE_OUT],
    params: { type: "object", properties: { column: columnOf("in") }, required: ["column"] },
    impl: { kind: "python", code: ZSCORE_CODE, entry: "run" },
    requires: { runtime: "python", packages: ["pandas"] },
  },
  {
    id: "core.view.bar",
    version: VERSION,
    name: "Gráfico de barras",
    category: "Vistas",
    inputs: [...TABLE_IN],
    outputs: [],
    params: {
      type: "object",
      properties: { x: columnOf("in"), y: columnOf("in") },
      required: ["x", "y"],
    },
    impl: {
      kind: "view",
      spec: {
        mark: "bar",
        encoding: {
          x: { field: "{{x}}", type: "nominal" },
          y: { field: "{{y}}", type: "quantitative", aggregate: "sum" },
        },
      },
    },
  },
  {
    id: "flow.input",
    version: VERSION,
    name: "Entrada",
    description: "Entrada de un flujo usado como nodo.",
    category: "Flujo",
    inputs: [],
    outputs: [{ id: "out", type: "any" }],
    params: {
      type: "object",
      properties: { name: { title: "Nombre", type: "string", default: "in" } },
    },
    impl: { kind: "builtin", name: "flow.input" },
  },
  {
    id: "flow.output",
    version: VERSION,
    name: "Salida",
    description: "Salida de un flujo usado como nodo.",
    category: "Flujo",
    inputs: [{ id: "in", type: "any" }],
    outputs: [],
    params: {
      type: "object",
      properties: { name: { title: "Nombre", type: "string", default: "out" } },
    },
    impl: { kind: "builtin", name: "flow.output" },
  },
];
