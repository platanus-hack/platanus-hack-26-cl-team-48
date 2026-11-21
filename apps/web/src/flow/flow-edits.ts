import type { Flow, FlowEdge, FlowNode, NodeManifest } from "@nodomics/protocol";

export type Position = FlowNode["position"];

/** A change to the flow being edited. Each one is data and has an inverse. */
export type FlowEdit =
  | { readonly type: "flow.rename"; readonly name: string | undefined }
  | { readonly type: "node.add"; readonly node: FlowNode }
  | { readonly type: "node.version"; readonly nodeId: string; readonly version: string }
  | { readonly type: "node.move"; readonly nodeId: string; readonly position: Position }
  | { readonly type: "node.remove"; readonly nodeIds: ReadonlyArray<string> }
  | { readonly type: "edge.add"; readonly edge: FlowEdge }
  | { readonly type: "edge.remove"; readonly edgeId: string }
  | {
      readonly type: "param.set";
      readonly nodeId: string;
      readonly param: string;
      readonly value: unknown;
    }
  | { readonly type: "customNode.set"; readonly manifest: NodeManifest }
  | { readonly type: "customNode.add"; readonly manifest: NodeManifest }
  | { readonly type: "customNode.remove"; readonly nodeType: string }
  | { readonly type: "batch"; readonly edits: ReadonlyArray<FlowEdit> };

type EditOf<T extends FlowEdit["type"]> = Extract<FlowEdit, { type: T }>;

type EditHandler<T extends FlowEdit["type"]> = {
  readonly apply: (flow: Flow, edit: EditOf<T>) => Flow;
  readonly invert: (flow: Flow, edit: EditOf<T>) => FlowEdit;
};

const EDIT_HANDLERS: { readonly [T in FlowEdit["type"]]: EditHandler<T> } = {
  "flow.rename": {
    apply: (flow, { name }) => {
      const renamed = { ...flow };
      if (name === undefined) delete renamed.name;
      else renamed.name = name;
      return renamed;
    },
    invert: (flow) => ({ type: "flow.rename", name: flow.name }),
  },
  "node.add": {
    apply: (flow, { node }) => ({ ...flow, nodes: [...flow.nodes, node] }),
    invert: (_flow, { node }) => ({ type: "node.remove", nodeIds: [node.id] }),
  },
  "node.version": {
    apply: (flow, { nodeId, version }) =>
      updateNode(flow, nodeId, (node) => ({ ...node, version })),
    invert: (flow, { nodeId, version }) => ({
      type: "node.version",
      nodeId,
      version: findNode(flow, nodeId)?.version ?? version,
    }),
  },
  "node.move": {
    apply: (flow, { nodeId, position }) =>
      updateNode(flow, nodeId, (node) => ({ ...node, position })),
    invert: (flow, { nodeId, position }) => ({
      type: "node.move",
      nodeId,
      position: findNode(flow, nodeId)?.position ?? position,
    }),
  },
  "node.remove": {
    apply: (flow, { nodeIds }) => ({
      ...flow,
      nodes: flow.nodes.filter((node) => !nodeIds.includes(node.id)),
      edges: flow.edges.filter((edge) => !touchesAny(edge, nodeIds)),
    }),
    invert: (flow, { nodeIds }) => ({
      type: "batch",
      edits: [
        ...flow.nodes
          .filter((node) => nodeIds.includes(node.id))
          .map((node): FlowEdit => ({ type: "node.add", node })),
        ...flow.edges
          .filter((edge) => touchesAny(edge, nodeIds))
          .map((edge): FlowEdit => ({ type: "edge.add", edge })),
      ],
    }),
  },
  "edge.add": {
    apply: (flow, { edge }) => ({ ...flow, edges: [...flow.edges, edge] }),
    invert: (_flow, { edge }) => ({ type: "edge.remove", edgeId: edge.id }),
  },
  "edge.remove": {
    apply: (flow, { edgeId }) => ({
      ...flow,
      edges: flow.edges.filter((edge) => edge.id !== edgeId),
    }),
    invert: (flow, { edgeId }) => {
      const edge = flow.edges.find((candidate) => candidate.id === edgeId);
      return edge === undefined ? { type: "batch", edits: [] } : { type: "edge.add", edge };
    },
  },
  "param.set": {
    apply: (flow, { nodeId, param, value }) =>
      updateNode(flow, nodeId, (node) => ({
        ...node,
        params: withParam(node.params, param, value),
      })),
    invert: (flow, { nodeId, param }) => ({
      type: "param.set",
      nodeId,
      param,
      value: findNode(flow, nodeId)?.params[param],
    }),
  },
  "customNode.set": {
    apply: (flow, { manifest }) => ({
      ...flow,
      customNodes: flow.customNodes?.some((candidate) => candidate.id === manifest.id)
        ? flow.customNodes.map((candidate) => (candidate.id === manifest.id ? manifest : candidate))
        : [...(flow.customNodes ?? []), manifest],
    }),
    invert: (flow, { manifest }) => {
      const previous = flow.customNodes?.find((candidate) => candidate.id === manifest.id);
      return previous === undefined
        ? { type: "customNode.remove", nodeType: manifest.id }
        : { type: "customNode.set", manifest: previous };
    },
  },
  "customNode.add": {
    apply: (flow, { manifest }) => ({
      ...flow,
      customNodes: [...(flow.customNodes ?? []), manifest],
    }),
    invert: (_flow, { manifest }) => ({ type: "customNode.remove", nodeType: manifest.id }),
  },
  "customNode.remove": {
    apply: (flow, { nodeType }) => ({
      ...flow,
      customNodes: (flow.customNodes ?? []).filter((manifest) => manifest.id !== nodeType),
    }),
    invert: (flow, { nodeType }) => {
      const manifest = flow.customNodes?.find((candidate) => candidate.id === nodeType);
      return manifest === undefined
        ? { type: "batch", edits: [] }
        : { type: "customNode.add", manifest };
    },
  },
  batch: {
    apply: (flow, { edits }) => edits.reduce(applyEdit, flow),
    invert: (flow, { edits }) => ({ type: "batch", edits: invertSequence(flow, edits) }),
  },
};

export function applyEdit(flow: Flow, edit: FlowEdit): Flow {
  // The mapped handler table guarantees the handler matches the edit's type.
  const handler = EDIT_HANDLERS[edit.type] as EditHandler<FlowEdit["type"]>;
  return handler.apply(flow, edit);
}

/** The edit that undoes `edit` when applied to the flow that `edit` produces from `flow`. */
export function invertEdit(flow: Flow, edit: FlowEdit): FlowEdit {
  const handler = EDIT_HANDLERS[edit.type] as EditHandler<FlowEdit["type"]>;
  return handler.invert(flow, edit);
}

function invertSequence(flow: Flow, edits: ReadonlyArray<FlowEdit>): FlowEdit[] {
  const { inverses } = edits.reduce<{ flow: Flow; inverses: FlowEdit[] }>(
    (step, edit) => ({
      flow: applyEdit(step.flow, edit),
      inverses: [invertEdit(step.flow, edit), ...step.inverses],
    }),
    { flow, inverses: [] },
  );
  return inverses;
}

const findNode = (flow: Flow, nodeId: string) => flow.nodes.find((node) => node.id === nodeId);

const updateNode = (flow: Flow, nodeId: string, update: (node: FlowNode) => FlowNode): Flow => ({
  ...flow,
  nodes: flow.nodes.map((node) => (node.id === nodeId ? update(node) : node)),
});

const touchesAny = (edge: FlowEdge, nodeIds: ReadonlyArray<string>) =>
  nodeIds.includes(edge.from.node) || nodeIds.includes(edge.to.node);

function withParam(params: FlowNode["params"], param: string, value: unknown): FlowNode["params"] {
  return value === undefined
    ? Object.fromEntries(Object.entries(params).filter(([key]) => key !== param))
    : { ...params, [param]: value };
}
