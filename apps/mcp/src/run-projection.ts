import type { Emit } from "@nodomics/coordinator";
import type { NepEvent, NepEventPayload, NodeError, ResultRef } from "@nodomics/protocol";

export type RunProjection = {
  readonly emit: Emit;
  readonly statuses: Map<string, NepEventPayload<"node.status">>;
  readonly results: Map<string, ResultRef>;
  readonly logs: Map<string, string[]>;
  readonly control: { finish?: () => void; failure?: string };
  readonly reset: () => void;
};
export function createRunProjection(): RunProjection {
  const statuses = new Map<string, NepEventPayload<"node.status">>();
  const results = new Map<string, ResultRef>();
  const logs = new Map<string, string[]>();
  const control: RunProjection["control"] = {};
  const handlers: { [E in NepEvent]: (payload: NepEventPayload<E>) => void } = {
    "node.status": (payload) => {
      statuses.set(payload.nodeId, payload);
    },
    "node.result": (payload) => {
      results.set(`${payload.nodeId}.${payload.port}`, payload.ref);
    },
    "node.display": () => undefined,
    "run.log": (payload) => {
      if (payload.nodeId === undefined) {
        if (payload.level === "error") control.failure = payload.message;
        return;
      }
      const lines = logs.get(payload.nodeId) ?? [];
      logs.set(payload.nodeId, [...lines, payload.message]);
    },
    "run.finished": () => {
      control.finish?.();
    },
  };
  return {
    statuses,
    results,
    logs,
    control,
    emit: (event, payload) => {
      handlers[event](payload);
    },
    reset: () => {
      statuses.clear();
      results.clear();
      logs.clear();
      delete control.failure;
      delete control.finish;
    },
  };
}
export const nodeErrorMessage = (error: NodeError): string =>
  `${error.message}${error.hint === undefined ? "" : ` (${error.hint})`}`;
