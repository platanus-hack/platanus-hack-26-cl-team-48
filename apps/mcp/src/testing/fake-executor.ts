import {
  toExecutorPort,
  type Column,
  type ExecutorCapabilities,
  type ExecutorHandlers,
  type ExecutorLog,
  type ExecutorMethod,
  type ExecutorParams,
  type ExecutorPort,
  type ExecutorResult,
  type NodeError,
  type ResultRef,
  type Task,
} from "@nodomics/protocol";

export type FakeExecutorOptions = {
  readonly capabilities: ExecutorCapabilities;
  /** Rows of every result it produces. */
  readonly rowCount?: number;
  /** The text of the `label` column of every row. */
  readonly label?: (index: number) => string;
  /** Returns the node error a task should fail with, if any. */
  readonly failWhen?: (task: Task) => NodeError | undefined;
  /** A message it logs, as `info`, while running each task. */
  readonly logWhileRunning?: string;
  /** The error every `exec.run` rejects with, if any. */
  readonly runThrows?: Error;
  /** The error every `exec.page` rejects with, if any. */
  readonly pageThrows?: Error;
  /** Makes every `exec.run` wait forever. */
  readonly hangRuns?: boolean;
};

export type RecordedCall = { readonly method: ExecutorMethod; readonly params: unknown };

/** An in-memory executor with deterministic rows `{ n: index, label }` that records every request. */
export type FakeExecutor = ExecutorPort & {
  readonly calls: ReadonlyArray<RecordedCall>;
  readonly tasks: ReadonlyArray<Task>;
};

const DEFAULT_ROW_COUNT = 3;
export const FAKE_SCHEMA: readonly Column[] = [
  { name: "n", type: "number" },
  { name: "label", type: "text" },
];
export const defaultLabel = (index: number): string => `row ${String(index)}`;

export function createFakeExecutor(options: FakeExecutorOptions): FakeExecutor {
  const calls: RecordedCall[] = [];
  const tasks: Task[] = [];
  const results = new Map<string, ResultRef>();
  const listeners = new Set<(log: ExecutorLog) => void>();
  const counter = { value: 0 };
  const rowCount = options.rowCount ?? DEFAULT_ROW_COUNT;
  const label = options.label ?? defaultLabel;
  const newResult = (count: number, schema: Column[]): ResultRef => {
    counter.value += 1;
    const ref = {
      id: `${options.capabilities.executor}-r${String(counter.value)}`,
      rowCount: count,
      schema,
    };
    results.set(ref.id, ref);
    return ref;
  };
  const emitLog = (entry: ExecutorLog) => {
    listeners.forEach((listener) => {
      listener(entry);
    });
  };
  const handlers: ExecutorHandlers = {
    "exec.hello": () => Promise.resolve(options.capabilities),
    "exec.run": async ({ taskId, task }) => {
      if (options.hangRuns === true) await new Promise(() => {});
      if (options.runThrows !== undefined) throw options.runThrows;
      tasks.push(task);
      if (options.logWhileRunning !== undefined)
        emitLog({ taskId, level: "info", message: options.logWhileRunning });
      const error = options.failWhen?.(task);
      return error === undefined
        ? { ok: true, outputs: { out: newResult(rowCount, [...FAKE_SCHEMA]) }, displays: [] }
        : { ok: false, error };
    },
    "exec.page": ({ resultId, offset, limit }) => {
      if (options.pageThrows !== undefined) return Promise.reject(options.pageThrows);
      const ref = requireResult(results, resultId);
      const end = Math.min(offset + limit, ref.rowCount);
      return Promise.resolve({
        columns: ref.schema,
        rows: Array.from({ length: Math.max(end - offset, 0) }, (_, index) => [
          offset + index,
          label(offset + index),
        ]),
        total: ref.rowCount,
      });
    },
    "exec.profile": ({ resultId }) =>
      Promise.resolve({
        columns: requireResult(results, resultId).schema.map(({ name, type }) => ({
          name,
          type,
          count: rowCount,
          nulls: 0,
          distinct: rowCount,
          bins: [],
        })),
      }),
    "exec.export": ({ resultId }) =>
      Promise.resolve({ arrow: encode(requireResult(results, resultId)) }),
    "exec.import": ({ arrow }) => {
      const original = decode(arrow);
      return Promise.resolve(newResult(original.rowCount, original.schema));
    },
    "exec.load": () => Promise.resolve({ ok: true, ref: newResult(rowCount, [...FAKE_SCHEMA]) }),
    "exec.drop": ({ resultIds }) => {
      resultIds.forEach((resultId) => results.delete(resultId));
      return Promise.resolve({});
    },
    "exec.display": ({ displayId }) => Promise.reject(new Error(`Unknown figure ${displayId}`)),
    "exec.complete": () => Promise.resolve({ items: [] }),
  };
  return {
    calls,
    tasks,
    ...toExecutorPort({
      handlers: recordHandlers(handlers, calls),
      onLog: (handler) => {
        listeners.add(handler);
        return () => listeners.delete(handler);
      },
    }),
  };
}

function recordHandlers(handlers: ExecutorHandlers, calls: RecordedCall[]): ExecutorHandlers {
  const record =
    <M extends ExecutorMethod>(method: M) =>
    (params: ExecutorParams<M>): Promise<ExecutorResult<M>> => {
      calls.push({ method, params });
      return handlers[method](params);
    };
  return {
    "exec.hello": record("exec.hello"),
    "exec.run": record("exec.run"),
    "exec.page": record("exec.page"),
    "exec.profile": record("exec.profile"),
    "exec.export": record("exec.export"),
    "exec.import": record("exec.import"),
    "exec.load": record("exec.load"),
    "exec.drop": record("exec.drop"),
    "exec.display": record("exec.display"),
    "exec.complete": record("exec.complete"),
  };
}

function requireResult(results: ReadonlyMap<string, ResultRef>, resultId: string): ResultRef {
  const ref = results.get(resultId);
  if (ref === undefined) throw new Error(`Unknown result ${resultId}`);
  return ref;
}

// Arrow is opaque to the coordinator, so the fake carries the result metadata as bytes instead.
const encode = (ref: ResultRef): Uint8Array => new TextEncoder().encode(JSON.stringify(ref));

function decode(bytes: Uint8Array): ResultRef {
  const ref: unknown = JSON.parse(new TextDecoder().decode(bytes));
  // Only bytes produced by `encode` above reach here.
  return ref as ResultRef;
}
