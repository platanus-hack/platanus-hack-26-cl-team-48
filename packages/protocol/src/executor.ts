import { Type, type Static } from "@sinclair/typebox";
import { NodeError } from "./errors.ts";
import {
  CodeCompletions,
  CodePosition,
  DataPage,
  DataProfile,
  DisplayContent,
  DisplayRef,
  Empty,
  PageWindow,
  ResultRef,
  Runtime,
  SourceFormat,
} from "./primitives.ts";

export const ExecutorCapabilities = Type.Object({
  executor: Type.String(),
  runtimes: Type.Array(Runtime),
  packages: Type.Optional(Type.Array(Type.String())),
  limits: Type.Optional(Type.Object({ memoryMB: Type.Optional(Type.Number()) })),
});
export type ExecutorCapabilities = Static<typeof ExecutorCapabilities>;

/** Inputs map the alias used inside the task to the id of a result held by the executor. */
const TaskInputs = Type.Record(Type.String(), Type.String());

export const SqlTask = Type.Object({
  kind: Type.Literal("sql"),
  query: Type.String(),
  inputs: TaskInputs,
});

export const PythonTask = Type.Object({
  kind: Type.Literal("python"),
  code: Type.String(),
  entry: Type.String(),
  inputs: TaskInputs,
  params: Type.Record(Type.String(), Type.Unknown()),
});

export const Task = Type.Union([SqlTask, PythonTask]);
export type Task = Static<typeof Task>;

const ExecRunResult = Type.Union([
  Type.Object({
    ok: Type.Literal(true),
    outputs: Type.Record(Type.String(), ResultRef),
    displays: Type.Optional(Type.Array(DisplayRef)),
  }),
  Type.Object({ ok: Type.Literal(false), error: NodeError }),
]);

/** Where an executor reads a source from; `path` only works for executors on the user's machine. */
const SourceLocation = Type.Union([
  Type.Object({ kind: Type.Literal("bytes"), bytes: Type.Uint8Array() }),
  Type.Object({ kind: Type.Literal("url"), url: Type.String() }),
  Type.Object({ kind: Type.Literal("path"), path: Type.String() }),
]);

const ExecLoadResult = Type.Union([
  Type.Object({ ok: Type.Literal(true), ref: ResultRef }),
  Type.Object({ ok: Type.Literal(false), error: NodeError }),
]);

const request = <P extends object, R extends object>(params: P, result: R) => ({ params, result });

/** Requests from the coordinator to an executor. Executors only run fully resolved tasks. */
export const ExecutorRequests = {
  "exec.hello": request(Empty, ExecutorCapabilities),
  "exec.run": request(Type.Object({ taskId: Type.String(), task: Task }), ExecRunResult),
  "exec.page": request(Type.Object({ resultId: Type.String(), ...PageWindow }), DataPage),
  "exec.profile": request(Type.Object({ resultId: Type.String() }), DataProfile),
  "exec.export": request(
    Type.Object({ resultId: Type.String() }),
    Type.Object({ arrow: Type.Uint8Array() }),
  ),
  "exec.import": request(Type.Object({ arrow: Type.Uint8Array() }), ResultRef),
  "exec.load": request(
    Type.Object({ sourceId: Type.String(), format: SourceFormat, location: SourceLocation }),
    ExecLoadResult,
  ),
  /** Releases results and figures alike: both are ids the executor holds. */
  "exec.drop": request(Type.Object({ resultIds: Type.Array(Type.String()) }), Empty),
  "exec.display": request(Type.Object({ displayId: Type.String() }), DisplayContent),
  "exec.complete": request(Type.Object(CodePosition), CodeCompletions),
};

export const ExecutorNotifications = {
  "exec.log": Type.Object({
    taskId: Type.String(),
    level: Type.Union([Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")]),
    message: Type.String(),
  }),
};

export type ExecutorMethod = keyof typeof ExecutorRequests;
export type ExecutorParams<M extends ExecutorMethod> = Static<
  (typeof ExecutorRequests)[M]["params"]
>;
export type ExecutorResult<M extends ExecutorMethod> = Static<
  (typeof ExecutorRequests)[M]["result"]
>;
export type ExecutorLog = Static<(typeof ExecutorNotifications)["exec.log"]>;

/** What the coordinator sees of an executor, whether it runs in-process or behind a transport. */
export interface ExecutorPort {
  request<M extends ExecutorMethod>(
    method: M,
    params: ExecutorParams<M>,
  ): Promise<ExecutorResult<M>>;
  onLog(handler: (log: ExecutorLog) => void): () => void;
}
