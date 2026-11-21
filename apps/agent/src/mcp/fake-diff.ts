import {
  omitKey,
  type CodeNode,
  type FakeEdge,
  type FakeFlow,
  type FakeNode,
} from "./fake-flow.ts";

export type FakeChangeKind =
  | "add_node"
  | "remove_node"
  | "connect"
  | "disconnect"
  | "set_param"
  | "add_custom_node"
  | "update_custom_node"
  | "declare_as_node";

export type FakeChange = {
  readonly id: string;
  readonly kind: FakeChangeKind;
  readonly target: string;
  readonly before?: unknown;
  readonly after?: unknown;
};

export type DiffEntry = {
  readonly change: FakeChange;
  readonly apply: (flow: FakeFlow) => FakeFlow;
};

type Draft = Omit<FakeChange, "id">;

const entry = (draft: Draft, apply: DiffEntry["apply"]): DiffEntry => ({
  change: { id: `${draft.kind}:${draft.target}`, ...draft },
  apply,
});

const edgeKey = (edge: FakeEdge): string => `${edge.from}->${edge.to}`;
const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const idsOnlyIn = (a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>) =>
  Object.keys(a).filter((id) => !(id in b));

function withNode(flow: FakeFlow, node: FakeNode): FakeFlow {
  return { ...flow, nodes: { ...flow.nodes, [node.id]: node } };
}

function withoutNode(flow: FakeFlow, nodeId: string): FakeFlow {
  return {
    ...flow,
    nodes: omitKey(flow.nodes, nodeId),
    customNodes: omitKey(flow.customNodes, nodeId),
  };
}

function nodeEntries(base: FakeFlow, draft: FakeFlow): DiffEntry[] {
  const added = idsOnlyIn(draft.nodes, base.nodes).flatMap((id) => {
    const node = draft.nodes[id];
    return node
      ? [entry({ kind: "add_node", target: id, after: node }, (f) => withNode(f, node))]
      : [];
  });
  const removed = idsOnlyIn(base.nodes, draft.nodes).map((id) =>
    entry({ kind: "remove_node", target: id, before: base.nodes[id] }, (f) => withoutNode(f, id)),
  );
  return [...added, ...removed];
}

function edgeEntries(base: FakeFlow, draft: FakeFlow): DiffEntry[] {
  const keys = (flow: FakeFlow): ReadonlySet<string> => new Set(flow.edges.map(edgeKey));
  const [baseKeys, draftKeys] = [keys(base), keys(draft)];
  const added = draft.edges.filter((e) => !baseKeys.has(edgeKey(e)));
  const removed = base.edges.filter((e) => !draftKeys.has(edgeKey(e)));
  return [
    ...added.map((e) =>
      entry({ kind: "connect", target: edgeKey(e), after: e }, (f) => ({
        ...f,
        edges: [...f.edges, e],
      })),
    ),
    ...removed.map((e) =>
      entry({ kind: "disconnect", target: edgeKey(e), before: e }, (f) => ({
        ...f,
        edges: f.edges.filter((x) => edgeKey(x) !== edgeKey(e)),
      })),
    ),
  ];
}

function setParamEntry(
  nodeId: string,
  name: string,
  values: readonly [unknown, unknown],
): DiffEntry {
  const apply = (f: FakeFlow): FakeFlow => {
    const node = f.nodes[nodeId];
    return node ? withNode(f, { ...node, params: { ...node.params, [name]: values[1] } }) : f;
  };
  return entry(
    { kind: "set_param", target: `${nodeId}.${name}`, before: values[0], after: values[1] },
    apply,
  );
}

function paramEntries(base: FakeFlow, draft: FakeFlow): DiffEntry[] {
  return Object.values(draft.nodes).flatMap((node) => {
    const before = base.nodes[node.id]?.params;
    if (!before) return [];
    const names = new Set([...Object.keys(before), ...Object.keys(node.params)]);
    return [...names]
      .filter((name) => !sameJson(before[name], node.params[name]))
      .map((name) => setParamEntry(node.id, name, [before[name], node.params[name]]));
  });
}

function codeEntries(base: FakeFlow, draft: FakeFlow): DiffEntry[] {
  return Object.values(draft.customNodes).flatMap((code: CodeNode) => {
    const before = base.customNodes[code.id];
    if (before && sameJson(before, code)) return [];
    const put = (f: FakeFlow): FakeFlow => ({
      ...f,
      customNodes: { ...f.customNodes, [code.id]: code },
    });
    const kind = before ? "update_custom_node" : "add_custom_node";
    return [entry({ kind, target: code.id, before, after: code }, put)];
  });
}

function asNodeEntries(base: FakeFlow, draft: FakeFlow): DiffEntry[] {
  if (sameJson(base.asNode, draft.asNode)) return [];
  const set = (f: FakeFlow): FakeFlow => ({ ...f, asNode: draft.asNode });
  const change = {
    kind: "declare_as_node",
    target: "flow",
    before: base.asNode,
    after: draft.asNode,
  } as const;
  return [entry(change, set)];
}

export const diffFlows = (base: FakeFlow, draft: FakeFlow): readonly DiffEntry[] => [
  ...nodeEntries(base, draft),
  ...codeEntries(base, draft),
  ...paramEntries(base, draft),
  ...edgeEntries(base, draft),
  ...asNodeEntries(base, draft),
];

export const applyEntries = (flow: FakeFlow, entries: readonly DiffEntry[]): FakeFlow =>
  entries.reduce((current, { apply }) => apply(current), flow);
