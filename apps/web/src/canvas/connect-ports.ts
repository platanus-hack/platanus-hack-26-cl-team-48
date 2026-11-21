import { nodePorts } from "@nodomics/protocol";
import type { DataType, Flow, FlowEdge, NodeManifest, PortRef, PortSpec } from "@nodomics/protocol";
import type { FlowEdit } from "../flow/flow-commands.ts";
import { createUniqueId } from "../flow/unique-id.ts";

const EDGE_ID_BASE = "edge";

export type Connection = { readonly from: PortRef; readonly to: PortRef };

/** The edit that connects two ports, or `undefined` when they cannot be connected. */
export function connectPorts(
  flow: Flow,
  catalog: ReadonlyArray<NodeManifest>,
  connection: Connection,
): FlowEdit | undefined {
  const output = findPort({ flow, catalog }, connection.from, "outputs");
  const input = findPort({ flow, catalog }, connection.to, "inputs");
  if (output === undefined || input === undefined) return undefined;
  if (connection.from.node === connection.to.node || !areCompatible(output.type, input.type))
    return undefined;
  return {
    type: "batch",
    edits: [
      ...replacedEdges(flow, connection.to, input),
      { type: "edge.add", edge: { id: newEdgeId(flow), ...connection } },
    ],
  };
}

/** The data type of an output port, used to colour its connections. */
export function outputType(
  flow: Flow,
  catalog: ReadonlyArray<NodeManifest>,
  ref: PortRef,
): DataType {
  return findPort({ flow, catalog }, ref, "outputs")?.type ?? "any";
}

function findPort(
  { flow, catalog }: { readonly flow: Flow; readonly catalog: ReadonlyArray<NodeManifest> },
  ref: PortRef,
  side: "inputs" | "outputs",
): PortSpec | undefined {
  const node = flow.nodes.find((node) => node.id === ref.node);
  const manifest = catalog.find((candidate) => candidate.id === node?.type);
  return manifest === undefined || node === undefined
    ? undefined
    : nodePorts(manifest, node.params)[side].find((port) => port.id === ref.port);
}

const areCompatible = (from: DataType, to: DataType) =>
  from === "any" || to === "any" || from === to;

function replacedEdges(flow: Flow, to: PortRef, input: PortSpec): FlowEdit[] {
  if (input.multi === true) return [];
  return flow.edges
    .filter((edge) => edge.to.node === to.node && edge.to.port === to.port)
    .map((edge) => ({ type: "edge.remove", edgeId: edge.id }));
}

const newEdgeId = (flow: Flow) =>
  createUniqueId(EDGE_ID_BASE, new Set(flow.edges.map((edge: FlowEdge) => edge.id)));
