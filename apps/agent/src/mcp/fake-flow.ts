import { createHash } from "node:crypto";
import { err, ok, type Result } from "@nodomics/protocol";
import { Value } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";

export type ParamSpec = {
  readonly title: string;
  readonly unit?: string;
  readonly schema: TSchema;
};

export type NodeManifest = {
  readonly type: string;
  readonly title: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly params: Readonly<Record<string, ParamSpec>>;
};

export type Catalog = Readonly<Record<string, NodeManifest>>;

export type FakeNode = {
  readonly id: string;
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
};

export type FakeEdge = { readonly from: string; readonly to: string };

export type CodeNode = {
  readonly id: string;
  readonly language: "python" | "sql";
  readonly code: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
};

export type AsNode = {
  readonly name: string;
  readonly inputs: readonly string[];
  readonly params: readonly string[];
};

export type FakeFlow = {
  readonly id: string;
  readonly nodes: Readonly<Record<string, FakeNode>>;
  readonly edges: readonly FakeEdge[];
  readonly customNodes: Readonly<Record<string, CodeNode>>;
  readonly asNode: AsNode | null;
};

export type FlowResult = Result<FakeFlow, string>;

const REVISION_LENGTH = 12;
const CODE_NODE_TYPE = "custom";

export const omitKey = <T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

export const emptyFlow = (id: string): FakeFlow => ({
  id,
  nodes: {},
  edges: [],
  customNodes: {},
  asNode: null,
});

export const revisionOf = (flow: FakeFlow): string =>
  createHash("sha256").update(JSON.stringify(flow)).digest("hex").slice(0, REVISION_LENGTH);

export function splitPortRef(ref: string): readonly [string, string] {
  const [nodeId = "", port = ""] = ref.split(".");
  return [nodeId, port];
}

export function portsOf(
  flow: FakeFlow,
  catalog: Catalog,
  nodeId: string,
): { readonly inputs: readonly string[]; readonly outputs: readonly string[] } | undefined {
  const code = flow.customNodes[nodeId];
  if (code) return code;
  const node = flow.nodes[nodeId];
  return node ? catalog[node.type] : undefined;
}

export function addNode(
  flow: FakeFlow,
  catalog: Catalog,
  input: { readonly type: string; readonly nodeId: string },
): FlowResult {
  if (!catalog[input.type]) return err(`Unknown node type "${input.type}"`);
  if (flow.nodes[input.nodeId]) return err(`Node "${input.nodeId}" already exists`);
  const node = { id: input.nodeId, type: input.type, params: {} };
  return ok({ ...flow, nodes: { ...flow.nodes, [input.nodeId]: node } });
}

export function removeNode(flow: FakeFlow, input: { readonly nodeId: string }): FlowResult {
  if (!flow.nodes[input.nodeId]) return err(`Node "${input.nodeId}" does not exist`);
  const nodes = omitKey(flow.nodes, input.nodeId);
  const customNodes = omitKey(flow.customNodes, input.nodeId);
  const touches = (ref: string): boolean => splitPortRef(ref)[0] === input.nodeId;
  const edges = flow.edges.filter((edge) => !touches(edge.from) && !touches(edge.to));
  return ok({ ...flow, nodes, customNodes, edges });
}

function hasCycle(edges: readonly FakeEdge[]): boolean {
  const next = (nodeId: string): string[] =>
    edges.filter((e) => splitPortRef(e.from)[0] === nodeId).map((e) => splitPortRef(e.to)[0]);
  const reaches = (from: string, target: string, seen: ReadonlySet<string>): boolean =>
    next(from).some(
      (id) => id === target || (!seen.has(id) && reaches(id, target, new Set([...seen, id]))),
    );
  return edges.some((e) => reaches(splitPortRef(e.to)[0], splitPortRef(e.from)[0], new Set()));
}

function checkPort(
  flow: FakeFlow,
  catalog: Catalog,
  query: { readonly ref: string; readonly side: "inputs" | "outputs" },
): string | null {
  const [nodeId, port] = splitPortRef(query.ref);
  const ports = portsOf(flow, catalog, nodeId);
  if (!ports) return `Node "${nodeId}" does not exist`;
  return ports[query.side].includes(port) ? null : `Node "${nodeId}" has no port "${port}"`;
}

export function connect(flow: FakeFlow, catalog: Catalog, edge: FakeEdge): FlowResult {
  const problem =
    checkPort(flow, catalog, { ref: edge.from, side: "outputs" }) ??
    checkPort(flow, catalog, { ref: edge.to, side: "inputs" });
  if (problem) return err(problem);
  if (flow.edges.some((e) => e.from === edge.from && e.to === edge.to)) return ok(flow);
  const edges = [...flow.edges, edge];
  return hasCycle(edges)
    ? err(`Connecting ${edge.from} to ${edge.to} creates a cycle`)
    : ok({ ...flow, edges });
}

export function disconnect(flow: FakeFlow, edge: FakeEdge): FlowResult {
  const edges = flow.edges.filter((e) => e.from !== edge.from || e.to !== edge.to);
  return edges.length === flow.edges.length
    ? err(`No connection from ${edge.from} to ${edge.to}`)
    : ok({ ...flow, edges });
}

export function setParam(
  flow: FakeFlow,
  catalog: Catalog,
  input: { readonly nodeId: string; readonly name: string; readonly value: unknown },
): FlowResult {
  const node = flow.nodes[input.nodeId];
  if (!node) return err(`Node "${input.nodeId}" does not exist`);
  const spec = catalog[node.type]?.params[input.name];
  if (!spec) return err(`Node "${input.nodeId}" has no parameter "${input.name}"`);
  if (!Value.Check(spec.schema, input.value)) {
    return err(`Value for "${input.name}" does not satisfy "${spec.title}"`);
  }
  const params = { ...node.params, [input.name]: input.value };
  return ok({ ...flow, nodes: { ...flow.nodes, [node.id]: { ...node, params } } });
}

export function putCodeNode(flow: FakeFlow, mode: "create" | "update", code: CodeNode): FlowResult {
  const exists = flow.customNodes[code.id] !== undefined;
  if (mode === "create" && (exists || flow.nodes[code.id]))
    return err(`Node "${code.id}" already exists`);
  if (mode === "update" && !exists) return err(`Code node "${code.id}" does not exist`);
  const node = { id: code.id, type: CODE_NODE_TYPE, params: {} };
  return ok({
    ...flow,
    nodes: { ...flow.nodes, [code.id]: flow.nodes[code.id] ?? node },
    customNodes: { ...flow.customNodes, [code.id]: code },
  });
}

export const declareAsNode = (flow: FakeFlow, asNode: AsNode): FlowResult =>
  ok({ ...flow, asNode });
