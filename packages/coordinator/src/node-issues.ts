import type { ConfigIssue, NodeError } from "@nodomics/protocol";
import { incomingEdges, type FlatGraph, type FlatNode } from "./flat-graph.ts";
import { validateParams } from "./validate-params.ts";

/** Everything that keeps a node from running, found without running it. */
export const findNodeIssues = (graph: FlatGraph, node: FlatNode): ConfigIssue[] => [
  ...validateParams(node),
  ...findMissingInputs(graph, node),
];

function findMissingInputs(graph: FlatGraph, node: FlatNode): ConfigIssue[] {
  const connected = new Set(incomingEdges(graph, node.id).map((edge) => edge.to.port));
  return node.manifest.inputs
    .filter((port) => port.optional !== true && !connected.has(port.id))
    .map((port) => ({
      nodeId: node.id,
      code: "INPUT_MISSING",
      message: `Conecta la entrada "${port.name ?? port.id}"`,
    }));
}

export const issueToError = ({ code, message, param }: ConfigIssue): NodeError =>
  param === undefined ? { code, message } : { code, message, param };
