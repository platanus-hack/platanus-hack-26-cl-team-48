import type { FlowGraph, FlowNode } from "@nodomics/protocol";

/** Upstream nodes first; ties keep the flow's order. A cycle is broken where it is first entered. */
export function orderTopologically(
  graph: FlowGraph,
  targets?: readonly string[],
): readonly FlowNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const ordered: FlowNode[] = [];
  const visit = (node: FlowNode): void => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    upstreamIdsOf(graph, node.id).forEach((id) => {
      const upstream = byId.get(id);
      if (upstream !== undefined) visit(upstream);
    });
    ordered.push(node);
  };
  graph.nodes.filter((node) => targets === undefined || targets.includes(node.id)).forEach(visit);
  return ordered;
}

export const upstreamIdsOf = (graph: FlowGraph, nodeId: string): string[] =>
  graph.edges.filter((edge) => edge.to.node === nodeId).map((edge) => edge.from.node);
