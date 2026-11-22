import { Worker } from "node:worker_threads";
import { err, type Result } from "@nodomics/protocol";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Runner } from "./runner.ts";
import type { StoreError } from "./stores.ts";

export type WorkerRunnerOptions = {
  /** Script of the worker that speaks the protocol below (in production, dist/runner-worker.js). */
  readonly workerUrl: URL;
  /** Limit per request; past it the worker is terminated. */
  readonly timeoutMs: number;
};
export type RunnerMethod = "run" | "sample" | "logs";
type Answer = Result<unknown, StoreError>;
type Pending = { readonly settle: (answer: Answer) => void; readonly timer: NodeJS.Timeout };

const TIMED_OUT = "The run timed out and the engine was restarted";
const RESTARTED = "The engine restarted before answering";
const STOPPED = "The engine worker stopped";
const CLOSED = "The engine is closed";

const NodeRuns = Type.Object({
  nodes: Type.Array(
    Type.Object({
      nodeId: Type.String(),
      status: Type.Union([Type.Literal("ok"), Type.Literal("error"), Type.Literal("skipped")]),
      error: Type.Union([Type.String(), Type.Null()]),
    }),
  ),
});
const SampleSchema = Type.Object({
  schema: Type.Object({
    columns: Type.Array(Type.Object({ name: Type.String(), type: Type.String() })),
  }),
  rows: Type.Array(Type.Record(Type.String(), Type.Unknown())),
  page: Type.Number(),
  hasMore: Type.Boolean(),
});
const LogsSchema = Type.Object({ nodeId: Type.String(), lines: Type.Array(Type.String()) });
const Reply = Type.Object({
  id: Type.Number(),
  result: Type.Union([
    Type.Object({ ok: Type.Literal(true), value: Type.Unknown() }),
    Type.Object({ ok: Type.Literal(false), error: Type.Object({ message: Type.String() }) }),
  ]),
});

/** Runs flows in a worker thread that never sees a token, and terminates it when a run hangs. */
export function createWorkerRunner(options: WorkerRunnerOptions): Runner & {
  readonly close: () => Promise<void>;
} {
  const thread = createThread(options);
  return {
    run: (flow, upTo) => thread.ask("run", [flow, upTo], NodeRuns),
    sample: (flow, request) => thread.ask("sample", [flow, request], SampleSchema),
    logs: (flow, nodeId) => thread.ask("logs", [flow, nodeId], LogsSchema),
    close: thread.close,
  };
}

function createThread({ workerUrl, timeoutMs }: WorkerRunnerOptions) {
  const pending = new Map<number, Pending>();
  const state: { worker: Worker | undefined; nextId: number; isClosed: boolean } = {
    worker: undefined,
    nextId: 0,
    isClosed: false,
  };
  const settleAll = (message: string) => {
    pending.forEach(({ settle, timer }) => {
      clearTimeout(timer);
      settle(err({ message }));
    });
    pending.clear();
  };
  const stop = (message: string) => {
    const worker = state.worker;
    state.worker = undefined;
    settleAll(message);
    void worker?.terminate();
  };
  const onReply = (message: unknown) => {
    if (!Value.Check(Reply, message)) return;
    const entry = pending.get(message.id);
    if (entry === undefined) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    entry.settle(message.result);
  };
  const start = (): Worker => {
    const worker = new Worker(workerUrl);
    const onStop = () => {
      if (worker === state.worker) stop(STOPPED);
    };
    worker.on("message", onReply).on("error", onStop).on("exit", onStop);
    state.worker = worker;
    return worker;
  };
  const send = (method: RunnerMethod, args: readonly unknown[]): Promise<Answer> =>
    new Promise((settle) => {
      const id = (state.nextId += 1);
      const timer = setTimeout(() => {
        pending.delete(id);
        settle(err({ message: TIMED_OUT }));
        stop(RESTARTED);
      }, timeoutMs);
      pending.set(id, { settle, timer });
      try {
        (state.worker ?? start()).postMessage({ id, method, args });
      } catch (error) {
        stop(error instanceof Error ? error.message : STOPPED);
      }
    });
  return {
    ask: async <S extends TSchema>(
      method: RunnerMethod,
      args: readonly unknown[],
      schema: S,
    ): Promise<Result<Static<S>, StoreError>> => {
      if (state.isClosed) return err({ message: CLOSED });
      return parseAnswer(await send(method, args), schema);
    },
    close: async () => {
      state.isClosed = true;
      stop(CLOSED);
      await Promise.resolve();
    },
  };
}

function parseAnswer<S extends TSchema>(answer: Answer, schema: S): Result<Static<S>, StoreError> {
  if (!answer.ok) return answer;
  return Value.Check(schema, answer.value)
    ? { ok: true, value: answer.value }
    : err({ message: "The engine answered with an unexpected shape" });
}
