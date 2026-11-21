import { nodePorts, type Flow, type FlowNode, type NodeManifest } from "@nodomics/protocol";
import type { FlowEdit } from "./flow-edits.ts";
export function nodeParamEdit({
  flow,
  node,
  manifest,
  param,
  value,
}: {
  readonly flow: Flow;
  readonly node: FlowNode;
  readonly manifest: NodeManifest;
  readonly param: string;
  readonly value: unknown;
}): FlowEdit {
  const ports = nodePorts(manifest, { ...node.params, [param]: value });
  return {
    type: "batch",
    edits: [
      { type: "param.set", nodeId: node.id, param, value },
      ...flow.edges
        .filter(
          (edge) =>
            (edge.from.node === node.id &&
              !ports.outputs.some((port) => port.id === edge.from.port)) ||
            (edge.to.node === node.id && !ports.inputs.some((port) => port.id === edge.to.port)),
        )
        .map((edge): FlowEdit => ({ type: "edge.remove", edgeId: edge.id })),
    ],
  };
}
