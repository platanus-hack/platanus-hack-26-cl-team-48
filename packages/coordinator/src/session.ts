import { NepErrorCode } from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError } from "@nodomics/rpc";
import type { EngineState, Session } from "./engine-state.ts";
import { findNode, type FlatNode } from "./flat-graph.ts";

/** The flow last sent with `flow.set`; requests about nodes make no sense without one. */
export function requireSession(state: EngineState): Session {
  const session = state.session.current;
  if (session === undefined)
    throw new RpcError(JsonRpcErrorCode.INVALID_PARAMS, "No flow was set with flow.set");
  return session;
}

export function requireNode(session: Session, nodeId: string): FlatNode {
  const node = findNode(session.analysis.graph, nodeId);
  if (node === undefined)
    throw new RpcError(NepErrorCode.UNKNOWN_NODE, `Unknown node in the current flow: ${nodeId}`);
  return node;
}
