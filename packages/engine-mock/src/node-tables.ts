import type { FlowGraph, FlowNode } from "@nodomics/protocol";
import { applySimpleFilter } from "./simple-filter.ts";
import type { Table } from "./table.ts";
import { orderTopologically, upstreamIdsOf } from "./topological-order.ts";
import { VENTAS } from "./ventas-dataset.ts";

type TableTransform = (input: Table, params: Readonly<Record<string, unknown>>) => Table;

/** Node types whose mock output differs from their input; every other node passes it through. */
const TABLE_TRANSFORMS: ReadonlyMap<string, TableTransform> = new Map([
  ["core.filter", applySimpleFilter],
]);

/** The table each node outputs in the mock: "ventas" flowing downstream, narrowed by filters. */
export function computeNodeTables(graph: FlowGraph): ReadonlyMap<string, Table> {
  const tables = new Map<string, Table>();
  orderTopologically(graph).forEach((node) => {
    tables.set(node.id, transformInput(node, inputTableOf(graph, node.id, tables)));
  });
  return tables;
}

const inputTableOf = (graph: FlowGraph, nodeId: string, tables: ReadonlyMap<string, Table>) =>
  upstreamIdsOf(graph, nodeId).flatMap((id) => tables.get(id) ?? [])[0] ?? VENTAS;

const transformInput = (node: FlowNode, input: Table): Table =>
  TABLE_TRANSFORMS.get(node.type)?.(input, node.params) ?? input;
