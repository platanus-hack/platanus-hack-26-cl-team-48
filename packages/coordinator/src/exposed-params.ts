import type { FlowGraph, FlowNode } from "@nodomics/protocol";
import type { Catalog } from "./catalog.ts";

const NODE_ENTRY = "flow.node";
const EXPOSED_PARAMS = "params";

type ExposedParam = { readonly id: string; readonly node: string; readonly param: string };

/**
 * The inner graph of a flow used as a node, with the values its node gives to the params that the
 * flow's node entry exposes (ADR 0016). An exposed param the node leaves unset keeps its inner value.
 */
export function withExposedParams(
  graph: FlowGraph,
  values: FlowNode["params"],
  catalog: Catalog,
): FlowGraph {
  const exposed = graph.nodes
    .filter((node) => isNodeEntry(catalog, node))
    .flatMap((node) => exposedParamsOf(node.params[EXPOSED_PARAMS]))
    .filter(({ id }) => values[id] !== undefined);
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      params: exposed
        .filter((binding) => binding.node === node.id)
        .reduce((params, { id, param }) => ({ ...params, [param]: values[id] }), node.params),
    })),
  };
}

function isNodeEntry(catalog: Catalog, node: FlowNode): boolean {
  const impl = catalog.get(node.type)?.impl;
  return impl?.kind === "builtin" && impl.name === NODE_ENTRY;
}

const exposedParamsOf = (value: unknown): ReadonlyArray<ExposedParam> =>
  Array.isArray(value) ? value.filter(isExposedParam) : [];

function isExposedParam(item: unknown): item is ExposedParam {
  return (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof item.id === "string" &&
    "node" in item &&
    typeof item.node === "string" &&
    "param" in item &&
    typeof item.param === "string"
  );
}
