import type { Flow } from "@nodomics/protocol";

export function bindSources(flow: Flow, sourceIds: Readonly<Record<string, string>>): Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => ({
      ...node,
      params:
        typeof node.params["sourceId"] === "string" &&
        sourceIds[node.params["sourceId"]] !== undefined
          ? { ...node.params, sourceId: sourceIds[node.params["sourceId"]] }
          : node.params,
    })),
  };
}
