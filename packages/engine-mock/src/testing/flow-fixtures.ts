import { FLOW_FORMAT, type Flow, type FlowEdge, type FlowNode } from "@nodomics/protocol";
import type { RecordedEvent } from "./connect-test-client.ts";

export const flowOf = (nodes: FlowNode[], edges: FlowEdge[] = []): Flow => ({
  format: FLOW_FORMAT,
  nodes,
  edges,
});

export const nodeOf = (
  id: string,
  type: string,
  params: Record<string, unknown> = {},
): FlowNode => ({
  id,
  type,
  version: "0.1.0",
  params,
  position: { x: 0, y: 0 },
});

export const edgeOf = (from: string, to: string): FlowEdge => ({
  id: `${from}-${to}`,
  from: { node: from, port: "out" },
  to: { node: to, port: "in" },
});

export const sourceNode = (id: string) => nodeOf(id, "core.source.csv", { sourceId: "src_ventas" });

/** A compact trace of run events, e.g. `status:n1:running`, `result:n1:out`, `finished:done`. */
export const traceOf = (events: readonly RecordedEvent[]): string[] =>
  events.map((recorded) => {
    switch (recorded.event) {
      case "node.status":
        return `status:${recorded.payload.nodeId}:${recorded.payload.state}`;
      case "node.result":
        return `result:${recorded.payload.nodeId}:${recorded.payload.port}`;
      case "node.display":
        return `display:${recorded.payload.nodeId}`;
      case "run.log":
        return `log:${recorded.payload.message}`;
      case "run.finished":
        return `finished:${recorded.payload.status}`;
    }
  });

export const resultRefOf = (events: readonly RecordedEvent[], nodeId: string) =>
  events.flatMap((recorded) =>
    recorded.event === "node.result" && recorded.payload.nodeId === nodeId
      ? [recorded.payload.ref]
      : [],
  )[0];
