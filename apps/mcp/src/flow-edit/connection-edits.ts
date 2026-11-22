import {
  err,
  nodePorts,
  ok,
  type Flow,
  type FlowEdge,
  type NodeManifest,
  type Result,
  type PortRef,
  type PortSpec,
} from "@nodomics/protocol";
import type { EditError } from "./edit-types.ts";
import { manifestOf } from "./node-edits.ts";
import { typeMismatch, withoutPreviousInput } from "./port-contract.ts";
import { revisionOf } from "./revision.ts";

export const edgeTarget = (edge: FlowEdge): string =>
  `${edge.from.node}.${edge.from.port}->${edge.to.node}.${edge.to.port}`;
export function resolvePort({
  flow,
  reference,
  side,
  catalog,
}: {
  flow: Flow;
  reference: string;
  side: "inputs" | "outputs";
  catalog: readonly NodeManifest[];
}): Result<{ readonly ref: PortRef; readonly spec: PortSpec }, EditError> {
  const node = [...flow.nodes]
    .sort((a, b) => b.id.length - a.id.length)
    .find((node) => reference.startsWith(`${node.id}.`));
  if (node === undefined) return err({ message: `Unknown node or port: ${reference}` });
  const port = reference.slice(node.id.length + 1);
  const manifest = manifestOf(flow, node.type, catalog);
  const spec =
    manifest === undefined
      ? undefined
      : nodePorts(manifest, node.params)[side].find((candidate) => candidate.id === port);
  return spec === undefined
    ? err({ message: `Unknown ${side} port: ${reference}` })
    : ok({ ref: { node: node.id, port }, spec });
}
export function connectNodes(
  flow: Flow,
  args: { from: string; to: string },
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  const from = resolvePort({ flow, reference: args.from, side: "outputs", catalog });
  if (!from.ok) return from;
  const to = resolvePort({ flow, reference: args.to, side: "inputs", catalog });
  if (!to.ok) return to;
  const target = `${args.from}->${args.to}`;
  if (flow.edges.some((edge) => edgeTarget(edge) === target)) return ok(flow);
  const mismatch = typeMismatch(from.value.spec, to.value.spec, target);
  if (mismatch !== undefined) return err({ message: mismatch });
  if (isReachable(flow, to.value.ref.node, from.value.ref.node))
    return err({ message: "Connection creates a cycle" });
  const edge = { id: "", from: from.value.ref, to: to.value.ref };
  const available = withoutPreviousInput(flow, edge.to, to.value.spec);
  return ok({
    ...available,
    edges: [
      ...available.edges,
      {
        ...edge,
        id: `edge_${revisionOf({ format: "nodomics/flow@0", nodes: [], edges: [edge] })}`,
      },
    ],
  });
}
export function disconnectNodes(
  flow: Flow,
  args: { from: string; to: string },
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  const from = resolvePort({ flow, reference: args.from, side: "outputs", catalog });
  if (!from.ok) return from;
  const to = resolvePort({ flow, reference: args.to, side: "inputs", catalog });
  if (!to.ok) return to;
  const edges = flow.edges.filter((edge) => edgeTarget(edge) !== `${args.from}->${args.to}`);
  return edges.length === flow.edges.length
    ? err({ message: `Unknown connection: ${args.from}->${args.to}` })
    : ok({ ...flow, edges });
}
export function isReachable(flow: Flow, from: string, to: string): boolean {
  const visited = new Set<string>();
  const visit = (current: string): boolean => {
    if (current === to) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    return flow.edges.some((edge) => edge.from.node === current && visit(edge.to.node));
  };
  return visit(from);
}
