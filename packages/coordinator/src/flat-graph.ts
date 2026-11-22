import type { FlowEdge, NodeManifest, PortRef } from "@nodomics/protocol";

/** A node of the flow once composite nodes are expanded; `origin` is the top-level node it came from. */
export type FlatNode = {
  readonly id: string;
  readonly origin: string;
  readonly type: string;
  readonly version: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly manifest: NodeManifest;
};

export type CompositeProjection = {
  readonly id: string;
  readonly nodes: ReadonlyArray<string>;
  readonly outputs: ReadonlyMap<string, PortRef>;
};

export type FlatGraph = {
  readonly composites?: ReadonlyArray<CompositeProjection>;
  readonly nodes: ReadonlyArray<FlatNode>;
  readonly edges: ReadonlyArray<FlowEdge>;
};

export const findNode = (graph: FlatGraph, nodeId: string): FlatNode | undefined =>
  graph.nodes.find((node) => node.id === nodeId);

export const incomingEdges = (graph: FlatGraph, nodeId: string): ReadonlyArray<FlowEdge> =>
  graph.edges.filter((edge) => edge.to.node === nodeId);

/** A resource node (ADR 0027) describes something to deploy: no executor runs it. */
export const isResourceNode = (graph: FlatGraph, nodeId: string): boolean =>
  findNode(graph, nodeId)?.manifest.impl.kind === "resource";
