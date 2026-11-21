import { NepErrorCode, type FlowNode } from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import { buildBarView } from "./bar-view.ts";
import { inferPortSchema } from "./infer-port-schema.ts";
import type { NepHandlers } from "./nep-handlers.ts";
import { computeNodeTables } from "./node-tables.ts";
import type { Session } from "./session.ts";
import type { Table } from "./table.ts";
import { pageTable } from "./table-page.ts";
import { profileTable } from "./table-profile.ts";
import { VENTAS } from "./ventas-dataset.ts";

export const createDataHandlers = (
  session: Session,
): Pick<
  NepHandlers,
  "data.page" | "data.profile" | "data.view" | "data.display" | "code.complete" | "schema.infer"
> => ({
  "data.page": ({ ref, ...request }) => {
    const page = pageTable(findResult(session, ref), request);
    if (!page.ok) throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, page.error);
    return page.value;
  },
  "data.profile": ({ ref }) => profileTable(findResult(session, ref)),
  "schema.infer": ({ nodeId, port }) =>
    inferPortSchema(findNode(session, nodeId), port, session.catalog),
  "data.view": ({ nodeId }) => {
    const node = findNode(session, nodeId);
    return buildBarView(
      computeNodeTables(session.currentFlow().flow).get(node.id) ?? VENTAS,
      node.params,
    );
  },
  "data.display": ({ ref }) => {
    throw new RpcError(NepErrorCode.RESULT_EXPIRED, `The mock engine holds no figure ${ref}`);
  },
  "code.complete": () => ({ items: [] }),
});

function findResult(session: Session, ref: string): Table {
  const table = session.results.get(ref);
  if (table === undefined)
    throw new RpcError(NepErrorCode.RESULT_EXPIRED, `Result expired or unknown: ${ref}`);
  return table;
}

function findNode(session: Session, nodeId: string): FlowNode {
  const node = session.currentFlow().flow.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined)
    throw new RpcError(NepErrorCode.UNKNOWN_NODE, `Node not in the current flow: ${nodeId}`);
  return node;
}
