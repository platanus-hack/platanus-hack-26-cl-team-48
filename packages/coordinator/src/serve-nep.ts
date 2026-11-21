import { NepRequests, parse } from "@nodomics/protocol";
import { JsonRpcErrorCode, RpcError, type RpcPeer } from "@nodomics/rpc";
import { SERVED_METHODS, type NepHandlers, type ServedMethod } from "./coordinator.ts";
import type { Emit } from "./engine-state.ts";

/** Registers one handler per NEP method; params are parsed here, at the boundary. */
export function serveNep(peer: RpcPeer, coordinator: NepHandlers): void {
  SERVED_METHODS.forEach((method) => {
    serveMethod(peer, method, coordinator[method]);
  });
}

/** Sends the coordinator's events (node events, `run.log`) to the client as notifications. */
export const createNepEmitter =
  (peer: RpcPeer): Emit =>
  (event, payload) => {
    peer.notify(event, payload);
  };

function serveMethod<M extends ServedMethod>(
  peer: RpcPeer,
  method: M,
  handler: NepHandlers[M],
): void {
  peer.handle(method, async (raw) => {
    const params = parse(NepRequests[method].params, raw);
    if (!params.ok)
      throw new RpcError(
        JsonRpcErrorCode.INVALID_PARAMS,
        `Invalid params for ${method}`,
        params.error,
      );
    return await handler(params.value);
  });
}
