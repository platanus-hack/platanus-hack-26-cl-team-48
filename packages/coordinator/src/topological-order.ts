import { err, ok, type ConfigIssue, type Result } from "@nodomics/protocol";
import type { FlatGraph } from "./flat-graph.ts";

/** Node ids with every node after the nodes it reads from; ties keep the flow order. */
export function topologicalOrder(graph: FlatGraph): Result<string[], ConfigIssue[]> {
  const order = sortByDependencies(graph);
  const unordered = graph.nodes.filter((node) => !order.includes(node.id));
  return unordered.length === 0 ? ok(order) : err(unordered.map((node) => cycleIssue(node.id)));
}

function sortByDependencies(graph: FlatGraph): string[] {
  const placed = new Set<string>();
  const isReady = (nodeId: string) =>
    !placed.has(nodeId) &&
    graph.edges.every((edge) => edge.to.node !== nodeId || placed.has(edge.from.node));
  const pickReady = () => graph.nodes.map((node) => node.id).filter(isReady);
  for (let ready = pickReady(); ready.length > 0; ready = pickReady())
    ready.forEach((nodeId) => placed.add(nodeId));
  return [...placed];
}

const cycleIssue = (nodeId: string): ConfigIssue => ({
  nodeId,
  code: "CYCLE",
  message: "El nodo forma parte de un ciclo o depende de uno",
});
