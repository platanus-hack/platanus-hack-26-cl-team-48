import {
  err,
  ok,
  type ColumnType,
  type NodeError,
  type PortRef,
  type Result,
} from "@nodomics/protocol";
import { renderedInputs, type TaskInput, type TaskInputs } from "./compile-task.ts";
import { findNode, incomingEdges, type FlatGraph, type FlatNode } from "./flat-graph.ts";
import { findNodeIssues, issueToError } from "./node-issues.ts";
import { declaredColumns } from "./output-contract.ts";
import { originOf } from "./relayed-port.ts";
import { renderTemplate } from "./render-template.ts";
import { topologicalOrder } from "./topological-order.ts";
import { quoteIdentifier } from "./sql-quoting.ts";

/** A SQL query that yields a node's columns without computing its rows. */
export type InferQuery = { readonly query: string; readonly inputs: TaskInputs };

type Accumulator = {
  readonly ctes: Map<string, string>;
  readonly inputs: Map<string, TaskInput>;
};

/**
 * Composes the SQL of a node and of its uncached upstream nodes as CTEs, reading cached upstream
 * results as task inputs, so the columns are known before the flow runs.
 */
export function buildInferQuery(
  graph: FlatGraph,
  nodeId: string,
  isCached: (nodeId: string) => boolean,
): Result<InferQuery, NodeError> {
  const order = topologicalOrder(graph);
  if (!order.ok)
    return err(
      issueToError(
        order.error[0] ?? { nodeId, code: "CYCLE", message: "El flujo contiene un ciclo" },
      ),
    );
  const accumulator: Accumulator = { ctes: new Map(), inputs: new Map() };
  const error = addNode({ graph, isCached, accumulator }, nodeId);
  if (error !== undefined) return err(error);
  return ok({
    query: `WITH ${[...accumulator.ctes].map(([name, sql]) => `${name} AS (${sql})`).join(", ")} SELECT * FROM ${cteName(nodeId)} LIMIT 0`,
    inputs: Object.fromEntries(accumulator.inputs),
  });
}

type Walk = {
  readonly graph: FlatGraph;
  readonly isCached: (nodeId: string) => boolean;
  readonly accumulator: Accumulator;
};

function addNode(walk: Walk, nodeId: string): NodeError | undefined {
  if (walk.accumulator.ctes.has(cteName(nodeId))) return undefined;
  const node = findNode(walk.graph, nodeId);
  if (node === undefined) return runFirstError();
  const issue = findNodeIssues(walk.graph, node)[0];
  if (issue !== undefined) return issueToError(issue);
  if (node.manifest.impl.kind !== "sql") return addDeclaredNode(walk, node);
  const tables = resolveTables(walk, node);
  if (!tables.ok) return tables.error;
  return addRenderedNode(walk, {
    node,
    template: node.manifest.impl.template,
    tables: tables.value,
  });
}

function resolveTables(walk: Walk, node: FlatNode): Result<Record<string, string>, NodeError> {
  const tables: Record<string, string> = {};
  for (const edge of incomingEdges(walk.graph, node.id)) {
    const table = resolveTable(walk, originOf(walk.graph, edge.from));
    if (!table.ok) return table;
    tables[edge.to.port] = table.value;
  }
  return ok(tables);
}

function resolveTable(walk: Walk, from: PortRef): Result<string, NodeError> {
  if (walk.isCached(from.node)) {
    const alias = `result_${from.node}_${from.port}`;
    walk.accumulator.inputs.set(alias, { kind: "node", node: from.node, port: from.port });
    return ok(alias);
  }
  const error = addNode(walk, from.node);
  return error === undefined ? ok(cteTable(from.node)) : err(error);
}

type RenderRequest = {
  readonly node: FlatNode;
  readonly template: string;
  readonly tables: Readonly<Record<string, string>>;
};

function addRenderedNode(
  walk: Walk,
  { node, template, tables }: RenderRequest,
): NodeError | undefined {
  const rendered = renderTemplate(template, { params: node.params, tables });
  if (!rendered.ok) return rendered.error;
  Object.entries(renderedInputs(rendered.value)).forEach(([alias, input]) => {
    walk.accumulator.inputs.set(alias, input);
  });
  walk.accumulator.ctes.set(cteName(node.id), rendered.value.sql);
  return undefined;
}

/** A node that is not SQL stands for an empty table with the columns its params declare. */
function addDeclaredNode(walk: Walk, node: FlatNode): NodeError | undefined {
  const [port] = node.manifest.outputs;
  const declared = port === undefined ? undefined : declaredColumns(node, port.id);
  if (declared === undefined) return runFirstError();
  walk.accumulator.ctes.set(
    cteName(node.id),
    `SELECT ${declared.map(({ name, type }) => `CAST(NULL AS ${SQL_TYPES[type]}) AS ${quoteIdentifier(name)}`).join(", ")}`,
  );
  return undefined;
}

const SQL_TYPES: Readonly<Record<ColumnType, string>> = {
  number: "DOUBLE",
  text: "VARCHAR",
  date: "DATE",
  bool: "BOOLEAN",
  geo: "VARCHAR",
  other: "VARCHAR",
};

const cteTable = (nodeId: string) => `node_${nodeId}`;

const cteName = (nodeId: string) => quoteIdentifier(cteTable(nodeId));

const runFirstError = (): NodeError => ({
  code: "INPUT_MISSING",
  message: "Ejecuta el flujo para conocer las columnas",
  hint: "Un nodo anterior no es SQL y todavía no tiene resultado",
});
