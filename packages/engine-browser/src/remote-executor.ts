import {
  ExecutorNotifications,
  ExecutorRequests,
  parse,
  type ExecutorMethod,
  type ExecutorParams,
  type ExecutorPort,
  type ExecutorResult,
} from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError, type RpcPeer } from "@nodomics/rpc";

export function createRemoteExecutor(peer: RpcPeer): ExecutorPort {
  return {
    request: (method, params) => requestParsed(peer, method, params),
    onLog: (handler) =>
      peer.on("exec.log", (raw) => {
        const log = parse(ExecutorNotifications["exec.log"], raw);
        if (log.ok) handler(log.value);
      }),
  };
}

async function requestParsed<M extends ExecutorMethod>(
  peer: RpcPeer,
  method: M,
  params: ExecutorParams<M>,
): Promise<ExecutorResult<M>> {
  const result = parse(ExecutorRequests[method].result, await peer.request(method, params));
  if (!result.ok)
    throw new RpcError(
      JsonRpcErrorCode.INTERNAL_ERROR,
      `Invalid response to ${method}`,
      result.error,
    );
  return result.value;
}
