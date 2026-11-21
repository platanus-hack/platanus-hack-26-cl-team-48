import type { ConfigIssue, Flow } from "@nodomics/protocol";
import { computeCacheKeys, type CacheKeys } from "./cache-keys.ts";
import { toCatalog, type Catalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import type { FlatGraph } from "./flat-graph.ts";
import { findNodeIssues } from "./node-issues.ts";
import { applyParamDefaults } from "./param-defaults.ts";
import { topologicalOrder } from "./topological-order.ts";

/** What the engine knows about a flow before running it. `keys` is in topological order. */
export type FlowAnalysis = {
  readonly graph: FlatGraph;
  readonly keys: CacheKeys;
  readonly issues: ConfigIssue[];
};

const EMPTY_GRAPH: FlatGraph = { nodes: [], edges: [] };

export function analyzeFlow(flow: Flow, catalog: Catalog): FlowAnalysis {
  const expanded = expandSubflows(flow, withCustomNodes(catalog, flow));
  if (!expanded.ok) return { graph: EMPTY_GRAPH, keys: new Map(), issues: expanded.error };
  const graph = withParamDefaults(expanded.value);
  const order = topologicalOrder(graph);
  if (!order.ok) return { graph, keys: new Map(), issues: order.error };
  return {
    graph,
    keys: computeCacheKeys(graph, order.value),
    issues: graph.nodes.flatMap((node) => findNodeIssues(graph, node)),
  };
}

const withCustomNodes = (catalog: Catalog, flow: Flow): Catalog =>
  new Map([...catalog, ...toCatalog(flow.customNodes ?? [])]);

const withParamDefaults = (graph: FlatGraph): FlatGraph => ({
  ...graph,
  nodes: graph.nodes.map((node) => ({
    ...node,
    params: applyParamDefaults(node.manifest.params, node.params),
  })),
});
