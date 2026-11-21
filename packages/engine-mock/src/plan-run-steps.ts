import type { FlowGraph, FlowNode, NodeError, NodeManifest } from "@nodomics/protocol";
import { unknownNodeTypeError, type Catalog } from "./flow-issues.ts";
import { computeNodeTables } from "./node-tables.ts";
import type { Table } from "./table.ts";
import { orderTopologically } from "./topological-order.ts";
import { VENTAS } from "./ventas-dataset.ts";

export type StatusStep = {
  readonly kind: "status";
  readonly nodeId: string;
  readonly state: "queued" | "running" | "done" | "error";
  readonly error?: NodeError;
};

export type ResultStep = {
  readonly kind: "result";
  readonly nodeId: string;
  readonly port: string;
  readonly table: Table;
};

export type RunStep = StatusStep | ResultStep;

/** Every event of a run, in order: all nodes queued, then each node runs in topological order. */
export function planRunSteps(
  graph: FlowGraph,
  catalog: Catalog,
  targets?: readonly string[],
): readonly RunStep[] {
  const ordered = orderTopologically(graph, targets);
  const tables = computeNodeTables({ ...graph, nodes: [...ordered] });
  return [
    ...ordered.map((node) => statusStep(node, "queued")),
    ...ordered.flatMap((node) =>
      runNodeSteps(node, catalog.get(node.type), tables.get(node.id) ?? VENTAS),
    ),
  ];
}

function runNodeSteps(node: FlowNode, manifest: NodeManifest | undefined, table: Table): RunStep[] {
  return manifest === undefined
    ? [
        statusStep(node, "running"),
        { ...statusStep(node, "error"), error: unknownNodeTypeError(node.type) },
      ]
    : [
        statusStep(node, "running"),
        statusStep(node, "done"),
        ...manifest.outputs.map((port) => resultStep({ node, port: port.id, table })),
      ];
}

const statusStep = (node: FlowNode, state: StatusStep["state"]): StatusStep => ({
  kind: "status",
  nodeId: node.id,
  state,
});

const resultStep = (step: { node: FlowNode; port: string; table: Table }): ResultStep => ({
  kind: "result",
  nodeId: step.node.id,
  port: step.port,
  table: step.table,
});
