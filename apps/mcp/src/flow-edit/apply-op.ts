import { err, ok, type Flow, type NodeManifest, type Result } from "@nodomics/protocol";
import { connectNodes, disconnectNodes } from "./connection-edits.ts";
import type { EditError, EditOp } from "./edit-types.ts";
import { addNode, createCodeNode, removeNode, updateCodeNode } from "./node-edits.ts";
import { setParam } from "./param-edits.ts";

export function applyOp(
  flow: Flow,
  op: EditOp,
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  switch (op.op) {
    case "add_node":
      return addNode(flow, op.args, catalog);
    case "remove_node":
      return removeNode(flow, op.args.nodeId);
    case "connect":
      return connectNodes(flow, op.args, catalog);
    case "disconnect":
      return disconnectNodes(flow, op.args, catalog);
    case "set_param":
      return setParam(flow, op.args, catalog);
    case "create_code_node":
      return createCodeNode(flow, op.args, catalog);
    case "update_code_node":
      return updateCodeNode(flow, op.args);
  }
}
export function applyBatch(
  flow: Flow,
  ops: readonly EditOp[],
  catalog: readonly NodeManifest[],
): Result<Flow, EditError> {
  let current = flow;
  for (const [index, op] of ops.entries()) {
    const next = applyOp(current, op, catalog);
    if (!next.ok) return err({ message: `ops[${String(index)}]: ${next.error.message}` });
    current = next.value;
  }
  return ok(current);
}
