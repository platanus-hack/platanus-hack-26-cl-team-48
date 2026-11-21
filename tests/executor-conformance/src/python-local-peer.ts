import {
  ExecutorNotifications,
  ExecutorRequests,
  parse,
  type ExecutorPort,
} from "@nodomics/protocol";
import type { RpcPeer } from "@nodomics/rpc";

export function createExecutorPeer(peer: RpcPeer): ExecutorPort {
  return {
    request: async (method, params) => {
      const result = parse(ExecutorRequests[method].result, await peer.request(method, params));
      if (!result.ok)
        throw new Error(`Invalid executor reply: ${method}: ${JSON.stringify(result.error)}`);
      return result.value;
    },
    onLog: (handler) =>
      peer.on("exec.log", (value) => {
        const log = parse(ExecutorNotifications["exec.log"], value);
        if (!log.ok) throw new Error("Invalid executor log");
        handler(log.value);
      }),
  };
}
