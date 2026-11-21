import {
  toExecutorPort,
  type ExecutorCapabilities,
  type ExecutorHandlers,
  type ExecutorLog,
  type ExecutorPort,
} from "@nodomics/protocol";

export function lazyExecutorPort(
  create: () => Promise<ExecutorPort>,
  capabilities: ExecutorCapabilities,
): ExecutorPort {
  let executor: Promise<ExecutorPort> | undefined;
  const listeners = new Set<(log: ExecutorLog) => void>();
  async function load(): Promise<ExecutorPort> {
    const port = await create();
    port.onLog((log) => {
      listeners.forEach((handler) => {
        handler(log);
      });
    });
    return port;
  }
  const forward: ExecutorPort["request"] = async (method, params) => {
    executor ??= load().catch((error: unknown) => {
      executor = undefined;
      throw error;
    });
    return (await executor).request(method, params);
  };
  const handlers: ExecutorHandlers = {
    "exec.hello": () => Promise.resolve(capabilities),
    "exec.run": (params) => forward("exec.run", params),
    "exec.page": (params) => forward("exec.page", params),
    "exec.profile": (params) => forward("exec.profile", params),
    "exec.export": (params) => forward("exec.export", params),
    "exec.import": (params) => forward("exec.import", params),
    "exec.load": (params) => forward("exec.load", params),
    "exec.drop": (params) => forward("exec.drop", params),
    "exec.display": (params) => forward("exec.display", params),
    "exec.complete": (params) => forward("exec.complete", params),
  };
  return toExecutorPort({
    handlers,
    onLog: (handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
      };
    },
  });
}
