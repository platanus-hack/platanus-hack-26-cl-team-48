import type {
  ExecutorLog,
  ExecutorMethod,
  ExecutorParams,
  ExecutorPort,
  ExecutorResult,
} from "./executor.ts";

/** One handler per executor protocol method; the type demands every method. */
export type ExecutorHandlers = {
  readonly [M in ExecutorMethod]: (params: ExecutorParams<M>) => Promise<ExecutorResult<M>>;
};

/** An executor that runs in the same process as the coordinator. */
export interface InProcessExecutor {
  readonly handlers: ExecutorHandlers;
  onLog(handler: (log: ExecutorLog) => void): () => void;
}

/** Adapts an in-process executor to the port the coordinator talks to. */
export function toExecutorPort(executor: InProcessExecutor): ExecutorPort {
  return {
    request: (method, params) => executor.handlers[method](params),
    onLog: (handler) => executor.onLog(handler),
  };
}
