import type {
  Capabilities,
  Column,
  ConfigIssue,
  NepEventPayload,
  NodeManifest,
} from "@nodomics/protocol";

export type ConnectionFailure = "protocol-mismatch" | "unauthorized" | "unreachable";

type NepEventOf<E extends "node.status" | "node.result" | "node.display" | "run.finished"> = {
  readonly type: E;
  readonly payload: NepEventPayload<E>;
};

/** Everything the interface learns about the engine. The engine store changes only through these. */
export type EngineEvent =
  | { readonly type: "session.connecting"; readonly engineId: string }
  | { readonly type: "session.connected"; readonly capabilities: Capabilities }
  | { readonly type: "session.failed"; readonly reason: ConnectionFailure }
  | { readonly type: "catalog.loaded"; readonly nodes: ReadonlyArray<NodeManifest> }
  | { readonly type: "flow.submitted"; readonly rev: number }
  | {
      readonly type: "flow.accepted";
      readonly rev: number;
      readonly stale: ReadonlyArray<string>;
      readonly errors: ReadonlyArray<ConfigIssue>;
    }
  | { readonly type: "run.rejected"; readonly rev: number }
  | { readonly type: "run.requested"; readonly rev: number }
  | { readonly type: "run.started"; readonly rev: number; readonly runId: string }
  | {
      readonly type: "schema.inferred";
      readonly rev: number;
      readonly nodeId: string;
      readonly port: string;
      readonly columns: ReadonlyArray<Column>;
    }
  | NepEventOf<"node.status">
  | NepEventOf<"node.result">
  | NepEventOf<"node.display">
  | NepEventOf<"run.finished">;
