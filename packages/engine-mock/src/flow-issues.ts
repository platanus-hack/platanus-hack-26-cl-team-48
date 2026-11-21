import type { ConfigIssue, FlowGraph, FlowNode, NodeError, NodeManifest } from "@nodomics/protocol";

export type Catalog = ReadonlyMap<string, NodeManifest>;

export const unknownNodeTypeError = (type: string): NodeError => ({
  code: "UNKNOWN_NODE_TYPE",
  message: `El tipo de nodo "${type}" no existe en este motor.`,
});

/** Configuration problems found without running: unknown node types and missing required params. */
export function findConfigIssues(graph: FlowGraph, catalog: Catalog): ConfigIssue[] {
  return graph.nodes.flatMap((node) => {
    const manifest = catalog.get(node.type);
    return manifest === undefined
      ? [{ nodeId: node.id, ...unknownNodeTypeError(node.type) }]
      : findMissingParams(node, manifest);
  });
}

const findMissingParams = (node: FlowNode, manifest: NodeManifest): ConfigIssue[] =>
  (manifest.params.required ?? [])
    .filter((param) => isMissing(node.params[param]))
    .map((param) => ({
      nodeId: node.id,
      code: "PARAM_REQUIRED",
      message: `Falta el parámetro "${param}".`,
      param,
    }));

const isMissing = (value: unknown) => value === undefined || value === null || value === "";
