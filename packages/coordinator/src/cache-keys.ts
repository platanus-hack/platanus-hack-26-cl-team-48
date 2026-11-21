import { canonicalJson } from "./canonical-json.ts";
import { findNode, incomingEdges, type FlatGraph, type FlatNode } from "./flat-graph.ts";
import { hashText } from "./hash-text.ts";

/** Node id → content key. A key only depends on the node type, version, params and input keys. */
export type CacheKeys = ReadonlyMap<string, string>;

/** `order` must be a topological order of the graph, so input keys exist when a node is keyed. */
export function computeCacheKeys(graph: FlatGraph, order: ReadonlyArray<string>): CacheKeys {
  const keys = new Map<string, string>();
  order.forEach((nodeId) => {
    keys.set(nodeId, hashText(canonicalJson(keyMaterial(graph, requireNode(graph, nodeId), keys))));
  });
  return keys;
}

const keyMaterial = (graph: FlatGraph, node: FlatNode, keys: CacheKeys) => ({
  type: node.type,
  version: node.version,
  params: node.params,
  inputs: incomingEdges(graph, node.id)
    .map((edge) => canonicalJson([edge.to.port, keys.get(edge.from.node), edge.from.port]))
    .sort(),
});

function requireNode(graph: FlatGraph, nodeId: string): FlatNode {
  const node = findNode(graph, nodeId);
  if (node === undefined) throw new Error(`Node ${nodeId} is in the order but not in the graph`);
  return node;
}
