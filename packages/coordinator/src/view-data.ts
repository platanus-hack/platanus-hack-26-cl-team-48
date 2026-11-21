import {
  NepErrorCode,
  type FlowEdge,
  type NepParams,
  type NepResult,
  type ResultRef,
} from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { executorAt, type EngineState, type Session } from "./engine-state.ts";
import { fillViewSpec } from "./fill-view-spec.ts";
import { incomingEdges, type FlatNode } from "./flat-graph.ts";
import { applyInputColumns } from "./input-columns.ts";
import { requireNode, requireSession } from "./session.ts";
import { quoteIdentifier } from "./sql-quoting.ts";
import { withTemporarySql } from "./temporary-sql.ts";

const MAX_VIEW_ROWS = 5000;
const PAGE_SIZE = 1000;
const VIEW_TABLE = "data";

type Row = Readonly<Record<string, unknown>>;

/** `data.view`: the node's view spec filled with its params and at most MAX_VIEW_ROWS rows. */
export async function viewData(
  state: EngineState,
  { nodeId }: NepParams<"data.view">,
): Promise<NepResult<"data.view">> {
  const session = requireSession(state);
  const node = requireNode(session, nodeId);
  if (node.manifest.impl.kind !== "view")
    throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, `Node ${nodeId} is not a view`);
  const edge = requireInputEdge(session, node);
  const input = requireCachedInput(state, session, edge);
  const rows = await withTemporarySql(
    state,
    {
      query: `SELECT * FROM ${quoteIdentifier(VIEW_TABLE)} LIMIT ${String(MAX_VIEW_ROWS)}`,
      inputs: { [VIEW_TABLE]: { kind: "node", node: edge.from.node, port: edge.from.port } },
      keys: session.analysis.keys,
    },
    (ref, executor) => readRows(state, { ref, executor }),
  );
  if (!rows.ok) throw new RpcError(JsonRpcErrorCode.INTERNAL_ERROR, rows.error.message, rows.error);
  const applied = applyInputColumns(node, (port) =>
    port === edge.to.port ? input.schema : undefined,
  );
  return {
    spec: fillViewSpec(node.manifest.impl.spec, applied.ok ? applied.value.params : node.params, {
      rows: rows.value,
      columns: input.schema,
    }),
    rowCount: rows.value.length,
    sampled: input.rowCount > MAX_VIEW_ROWS,
  };
}

function requireInputEdge(session: Session, node: FlatNode): FlowEdge {
  const [edge] = incomingEdges(session.analysis.graph, node.id);
  if (edge === undefined) throw expired(node.id);
  return edge;
}

function requireCachedInput(state: EngineState, session: Session, edge: FlowEdge): ResultRef {
  const ref = state.store.get(session.analysis.keys.get(edge.from.node) ?? "")?.outputs[
    edge.from.port
  ];
  if (ref === undefined) throw expired(edge.to.node);
  return ref;
}

async function readRows(
  state: EngineState,
  located: { readonly ref: ResultRef; readonly executor: number },
): Promise<Row[]> {
  const rows: Row[] = [];
  const total = Math.min(located.ref.rowCount, MAX_VIEW_ROWS);
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const page = await executorAt(state, located.executor).request("exec.page", {
      resultId: located.ref.id,
      offset,
      limit: Math.min(PAGE_SIZE, total - offset),
    });
    rows.push(
      ...page.rows.map((values) =>
        Object.fromEntries(page.columns.map((column, index) => [column.name, values[index]])),
      ),
    );
  }
  return rows;
}

const expired = (nodeId: string) =>
  new RpcError(NepErrorCode.RESULT_EXPIRED, `Run the flow to see the view ${nodeId}`);
