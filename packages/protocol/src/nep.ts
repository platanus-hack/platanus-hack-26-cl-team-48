import { Type, type Static } from "@sinclair/typebox";
import { NodeError, NodeErrorCode } from "./errors.ts";
import { Flow } from "./flow.ts";
import { NodeManifest } from "./manifest.ts";
import {
  CodeCompletions,
  CodePosition,
  Column,
  DataPage,
  DataProfile,
  DisplayContent,
  DisplayRef,
  Empty,
  Id,
  PageWindow,
  ResultRef,
  Revision,
  Runtime,
} from "./primitives.ts";

export const PROTOCOL_VERSION = "0.1";

const EngineKind = Type.Union([
  Type.Literal("browser"),
  Type.Literal("local"),
  Type.Literal("cloud"),
  Type.Literal("mock"),
]);

const SourceKind = Type.Union([Type.Literal("url"), Type.Literal("upload"), Type.Literal("path")]);

export const Capabilities = Type.Object({
  protocol: Type.String(),
  engine: EngineKind,
  runtimes: Type.Array(Runtime),
  pythonPackages: Type.Optional(Type.Array(Type.String())),
  limits: Type.Optional(Type.Object({ memoryMB: Type.Optional(Type.Number()) })),
  sources: Type.Array(SourceKind),
  /** Whether `code.complete` reaches an executor; without it the interface completes on its own. */
  codeCompletion: Type.Optional(Type.Boolean()),
});
export type Capabilities = Static<typeof Capabilities>;

export const NodeState = Type.Union([
  Type.Literal("stale"),
  Type.Literal("queued"),
  Type.Literal("running"),
  Type.Literal("done"),
  Type.Literal("cached"),
  Type.Literal("error"),
  Type.Literal("cancelled"),
]);
export type NodeState = Static<typeof NodeState>;

export const ConfigIssue = Type.Object({
  nodeId: Id,
  code: NodeErrorCode,
  message: Type.String(),
  param: Type.Optional(Type.String()),
});
export type ConfigIssue = Static<typeof ConfigIssue>;

const SourceAddParams = Type.Union([
  Type.Object({
    kind: Type.Literal("url"),
    url: Type.String(),
    name: Type.Optional(Type.String()),
  }),
  Type.Object({ kind: Type.Literal("upload"), name: Type.String(), file: Type.Unknown() }),
  Type.Object({ kind: Type.Literal("path"), path: Type.String() }),
]);

const SchemaInferResult = Type.Union([
  Type.Object({ ok: Type.Literal(true), columns: Type.Array(Column) }),
  Type.Object({ ok: Type.Literal(false), error: NodeError }),
]);

const request = <P extends object, R extends object>(params: P, result: R) => ({ params, result });

/** Requests from the interface to an engine, each with its params and result schema. */
export const NepRequests = {
  "engine.hello": request(
    Type.Object({
      protocol: Type.String(),
      client: Type.String(),
      token: Type.Optional(Type.String()),
    }),
    Capabilities,
  ),
  "nodes.list": request(Empty, Type.Object({ nodes: Type.Array(NodeManifest) })),
  "nodes.register": request(Type.Object({ nodes: Type.Array(NodeManifest) }), Empty),
  "source.add": request(
    SourceAddParams,
    Type.Object({ sourceId: Type.String(), name: Type.String() }),
  ),
  "flow.set": request(
    Type.Object({ rev: Revision, flow: Flow }),
    Type.Object({ rev: Revision, stale: Type.Array(Id), errors: Type.Array(ConfigIssue) }),
  ),
  "flow.run": request(
    Type.Object({ rev: Revision, targets: Type.Optional(Type.Array(Id)) }),
    Type.Object({ runId: Type.String() }),
  ),
  "run.cancel": request(Type.Object({ runId: Type.String() }), Empty),
  "schema.infer": request(Type.Object({ nodeId: Id, port: Id }), SchemaInferResult),
  "data.page": request(Type.Object({ ref: Type.String(), ...PageWindow }), DataPage),
  "data.profile": request(Type.Object({ ref: Type.String() }), DataProfile),
  "data.view": request(
    Type.Object({ nodeId: Id }),
    Type.Object({
      spec: Type.Unknown(),
      rowCount: Type.Integer({ minimum: 0 }),
      sampled: Type.Boolean(),
    }),
  ),
  "data.display": request(Type.Object({ ref: Type.String() }), DisplayContent),
  /** Completes code being edited, so `code` need not be the code in the flow yet. */
  "code.complete": request(Type.Object({ nodeId: Id, ...CodePosition }), CodeCompletions),
};

/** Events from an engine to the interface. Every flow-scoped event carries the flow revision. */
export const NepNotifications = {
  "node.status": Type.Object({
    rev: Revision,
    runId: Type.String(),
    nodeId: Id,
    state: NodeState,
    progress: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    error: Type.Optional(NodeError),
    executor: Type.Optional(Type.String()),
  }),
  "node.result": Type.Object(
    { rev: Revision, runId: Type.String(), nodeId: Id, port: Id, ref: ResultRef },
    { additionalProperties: false },
  ),
  /** The figures a node showed in this run; sent after its results, also for cached nodes. */
  "node.display": Type.Object({
    rev: Revision,
    runId: Type.String(),
    nodeId: Id,
    displays: Type.Array(DisplayRef),
  }),
  "run.log": Type.Object({
    runId: Type.String(),
    nodeId: Type.Optional(Id),
    level: Type.Union([Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")]),
    message: Type.String(),
  }),
  "run.finished": Type.Object({
    rev: Revision,
    runId: Type.String(),
    status: Type.Union([Type.Literal("done"), Type.Literal("error"), Type.Literal("cancelled")]),
    durationMs: Type.Number({ minimum: 0 }),
    executed: Type.Array(Id),
    cached: Type.Array(Id),
  }),
};

export type NepMethod = keyof typeof NepRequests;
export type NepParams<M extends NepMethod> = Static<(typeof NepRequests)[M]["params"]>;
export type NepResult<M extends NepMethod> = Static<(typeof NepRequests)[M]["result"]>;
export type NepEvent = keyof typeof NepNotifications;
export type NepEventPayload<E extends NepEvent> = Static<(typeof NepNotifications)[E]>;
