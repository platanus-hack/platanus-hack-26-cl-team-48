/** Flows of the demo script (docs/04-poc-una-noche.md §6), written as the `.nodo.json` format. */

const FLOW_FORMAT = "nodomics/flow@0";
const NODE_VERSION = "0.1.0";
const COLUMN_GAP = 260;
const ROW_GAP = 220;

export const DEMO_MIN_UNITS = 5;

type NodeSpec = {
  readonly id: string;
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly column: number;
  readonly row?: number;
};

const node = ({ id, type, params, column, row = 0 }: NodeSpec) => ({
  id,
  type,
  version: NODE_VERSION,
  params,
  position: { x: column * COLUMN_GAP, y: row * ROW_GAP },
});

const edge = (from: string, to: string) => ({
  id: `${from}-${to}`,
  from: { node: from, port: "out" },
  to: { node: to, port: "in" },
});

const sampleSource = () =>
  node({ id: "source", type: "core.source.sample", params: { dataset: "ventas" }, column: 0 });

const filterAbove = (minUnits: number) =>
  node({
    id: "filter",
    type: "core.filter",
    params: { column: "unidades", op: ">", value: String(minUnits) },
    column: 1,
  });

const groupByRegion = () =>
  node({
    id: "group",
    type: "core.group",
    params: {
      groupBy: ["region"],
      aggregations: [{ column: "unidades", fn: "SUM", name: "total" }],
    },
    column: 2,
  });

/** Ventas → Filtrar (unidades > 5) → Agrupar (total por región) → Gráfico de barras, and Ventas → Puntaje Z. */
export const salesDemoFlow = () => ({
  format: FLOW_FORMAT,
  nodes: [
    sampleSource(),
    filterAbove(DEMO_MIN_UNITS),
    groupByRegion(),
    node({ id: "chart", type: "core.view.bar", params: { x: "region", y: "total" }, column: 3 }),
    node({
      id: "zscore",
      type: "core.python.zscore",
      params: { column: "precio" },
      column: 1,
      row: 1,
    }),
  ],
  edges: [
    edge("source", "filter"),
    edge("filter", "group"),
    edge("group", "chart"),
    edge("source", "zscore"),
  ],
});

/** Only the sample source: the starting point of a second flow. */
export const sampleOnlyFlow = () => ({ format: FLOW_FORMAT, nodes: [sampleSource()], edges: [] });

type ExportedNode = Readonly<Record<string, unknown>> & { readonly id: string };

const isExportedNode = (value: unknown): value is ExportedNode =>
  typeof value === "object" && value !== null && "id" in value && typeof value.id === "string";

/** The first node of an exported `.nodo.json`, kept as is (an uploaded source keeps its `sourceId`). */
export function firstNodeOf(flow: unknown): ExportedNode {
  const first: unknown =
    typeof flow === "object" && flow !== null && "nodes" in flow && Array.isArray(flow.nodes)
      ? flow.nodes[0]
      : undefined;
  if (!isExportedNode(first)) throw new Error("The exported flow has no nodes");
  return first;
}

/** Filtrar → Agrupar over an uploaded source node, as the 1M-row step needs. */
export const filterAndGroupFlow = (source: ExportedNode, minUnits: number) => ({
  format: FLOW_FORMAT,
  nodes: [source, filterAbove(minUnits), groupByRegion()],
  edges: [edge(source.id, "filter"), edge("filter", "group")],
});

/** Filtrar over a column the sample does not have: the node must show the error. */
export const missingColumnFlow = () => ({
  format: FLOW_FORMAT,
  nodes: [
    sampleSource(),
    node({
      id: "filter",
      type: "core.filter",
      params: { column: "no_existe", op: ">", value: "5" },
      column: 1,
    }),
  ],
  edges: [edge("source", "filter")],
});

/** Ventas → Código Python running `code`, the custom code node of the user. */
export const pythonCodeFlow = (code: string) => ({
  format: FLOW_FORMAT,
  nodes: [
    sampleSource(),
    node({ id: "code", type: "core.python.custom", params: { code }, column: 1 }),
  ],
  edges: [edge("source", "code")],
});

/** Ventas → Gráfico de líneas with `params`. */
export const lineChartFlow = (params: Readonly<Record<string, unknown>>) => ({
  format: FLOW_FORMAT,
  nodes: [sampleSource(), node({ id: "line", type: "core.view.line", params, column: 1 })],
  edges: [edge("source", "line")],
});

/** Ventas → Convertir tipos (`conversions`) → Gráfico de líneas of units by date. */
export const castThenLineFlow = (
  conversions: ReadonlyArray<Readonly<Record<string, unknown>>>,
) => ({
  format: FLOW_FORMAT,
  nodes: [
    sampleSource(),
    node({ id: "cast", type: "core.cast", params: { conversions }, column: 1 }),
    node({
      id: "line",
      type: "core.view.line",
      params: { x: "fecha", y: "unidades" },
      column: 2,
    }),
  ],
  edges: [edge("source", "cast"), edge("cast", "line")],
});

/** Ventas → Código Python running `code` with extra params, such as its declared output columns. */
export const pythonContractFlow = (code: string, params: Readonly<Record<string, unknown>>) => ({
  format: FLOW_FORMAT,
  nodes: [
    sampleSource(),
    node({ id: "code", type: "core.python.custom", params: { code, ...params }, column: 1 }),
  ],
  edges: [edge("source", "code")],
});
