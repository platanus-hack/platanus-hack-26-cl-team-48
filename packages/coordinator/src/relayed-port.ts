import type { PortRef } from "@nodomics/protocol";
import { findNode, incomingEdges, type FlatGraph } from "./flat-graph.ts";

/**
 * The port whose data reaches `ref` unchanged: what is connected to the same port of a node entry
 * (the only builtin left after expansion, ADR 0016), followed through chained entries. Any other
 * port is its own origin.
 */
export function originOf(graph: FlatGraph, ref: PortRef): PortRef {
  if (findNode(graph, ref.node)?.manifest.impl.kind !== "builtin") return ref;
  const from = incomingEdges(graph, ref.node).find((edge) => edge.to.port === ref.port)?.from;
  return from === undefined ? ref : originOf(graph, from);
}
