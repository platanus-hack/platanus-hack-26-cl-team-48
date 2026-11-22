import type { ExecutorPort } from "@nodomics/protocol";
import type { RunProjection } from "./run-projection.ts";

export function captureExecutorErrors(
  executor: ExecutorPort,
  projection: RunProjection,
): ExecutorPort {
  return {
    onLog: (handler) => executor.onLog(handler),
    request: async (method, params) => {
      try {
        return await executor.request(method, params);
      } catch (error) {
        projection.control.failure = error instanceof Error ? error.message : String(error);
        throw error;
      }
    },
  };
}
