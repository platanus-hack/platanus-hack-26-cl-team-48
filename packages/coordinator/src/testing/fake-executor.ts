import {
  toExecutorPort,
  type ExecutorHandlers,
  type Column,
  type DisplayRef,
  type ExecutorCapabilities,
  type ExecutorLog,
  type ExecutorMethod,
  type ExecutorPort,
  type ExecutorParams,
  type ExecutorResult,
  type NodeError,
  type ResultRef,
  type Task,
} from "@nodomics/protocol";

export type FakeExecutorOptions = {
  readonly capabilities: ExecutorCapabilities;
  /** Rows of every result it produces. */
  readonly rowCount?: number;
  /** Returns the node error a task should fail with, if any. */
  readonly failWhen?: (task: Task) => NodeError | undefined;
  /** The node error every `exec.load` fails with, if any. */
  readonly loadError?: NodeError;
  /** A message it logs, as `info`, while running each task. */
  readonly logWhileRunning?: string;
  /** How many figures each successful task shows. */
  readonly figuresPerTask?: number;
};

export type RecordedCall = { readonly method: ExecutorMethod; readonly params: unknown };

/** An in-memory executor with deterministic results that records every request it receives. */
export type FakeExecutor = ExecutorPort & {
  readonly calls: ReadonlyArray<RecordedCall>;
  readonly tasks: ReadonlyArray<Task>;
  readonly heldResultIds: () => ReadonlyArray<string>;
  readonly heldDisplayIds: () => ReadonlyArray<string>;
  readonly log: (entry: ExecutorLog) => void;
  /** Makes `exec.run` wait until the returned function is called. */
  readonly holdRuns: () => () => void;
};

const DEFAULT_ROW_COUNT = 3;
const FAKE_SCHEMA: Column[] = [{ name: "x", type: "number" }];
const FAKE_FIGURE_SIZE = { width: 640, height: 480 };
/** The completion it offers for any code, so tests can tell it reached the executor. */
export const FAKE_COMPLETION = { label: "read_csv", kind: "function" } as const;

export function createFakeExecutor(options: FakeExecutorOptions): FakeExecutor {
  const calls: RecordedCall[] = [];
  const tasks: Task[] = [];
  const results = new Map<string, ResultRef>();
  const displays = new Map<string, DisplayRef>();
  const listeners = new Set<(log: ExecutorLog) => void>();
  const emitLog = (entry: ExecutorLog) => {
    listeners.forEach((listener) => {
      listener(entry);
    });
  };
  const gate = { opened: Promise.resolve() };
  const counter = { value: 0 };
  const newResult = (rowCount: number, schema: Column[]): ResultRef => {
    counter.value += 1;
    const ref = {
      id: `${options.capabilities.executor}-r${String(counter.value)}`,
      rowCount,
      schema,
    };
    results.set(ref.id, ref);
    return ref;
  };
  const newDisplays = (): DisplayRef[] =>
    Array.from({ length: options.figuresPerTask ?? 0 }, () => {
      counter.value += 1;
      const display = {
        id: `${options.capabilities.executor}-d${String(counter.value)}`,
        mime: "image/png" as const,
        ...FAKE_FIGURE_SIZE,
      };
      displays.set(display.id, display);
      return display;
    });
  const rowCount = options.rowCount ?? DEFAULT_ROW_COUNT;
  const handlers: ExecutorHandlers = {
    "exec.hello": () => Promise.resolve(options.capabilities),
    "exec.run": async ({ taskId, task }) => {
      await gate.opened;
      tasks.push(task);
      if (options.logWhileRunning !== undefined)
        emitLog({ taskId, level: "info", message: options.logWhileRunning });
      Object.values(task.inputs).forEach((resultId) => requireResult(results, resultId));
      const error = options.failWhen?.(task);
      return error === undefined
        ? { ok: true, outputs: { out: newResult(rowCount, FAKE_SCHEMA) }, displays: newDisplays() }
        : { ok: false, error };
    },
    "exec.page": ({ resultId, offset, limit }) => {
      const ref = requireResult(results, resultId);
      const end = Math.min(offset + limit, ref.rowCount);
      return Promise.resolve({
        columns: ref.schema,
        rows: Array.from({ length: Math.max(end - offset, 0) }, (_, index) => [offset + index]),
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
    "exec.load": () =>
      Promise.resolve(
        options.loadError === undefined
          ? { ok: true, ref: newResult(rowCount, FAKE_SCHEMA) }
          : { ok: false, error: options.loadError },
      ),
    "exec.drop": ({ resultIds }) => {
      resultIds.forEach((resultId) => {
        results.delete(resultId);
        displays.delete(resultId);
      });
      return Promise.resolve({});
    },
    "exec.display": ({ displayId }) => {
      if (!displays.has(displayId)) throw new Error(`Unknown figure ${displayId}`);
      return Promise.resolve({ mime: "image/png", bytes: encodeText(displayId) });
    },
    "exec.complete": () => Promise.resolve({ items: [FAKE_COMPLETION] }),
  };
  return {
    calls,
    tasks,
    heldResultIds: () => [...results.keys()],
    heldDisplayIds: () => [...displays.keys()],
    log: emitLog,
    holdRuns: () => {
      const release = { open: () => {} };
      gate.opened = new Promise((resolve) => (release.open = resolve));
      return () => {
        release.open();
      };
    },
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
const encode = (ref: ResultRef): Uint8Array => encodeText(JSON.stringify(ref));

/** The fake's figures are the bytes of their own id, so tests can tell which one was served. */
export const encodeText = (text: string): Uint8Array =>
  Uint8Array.from(text, (char) => char.charCodeAt(0));

function decode(bytes: Uint8Array): ResultRef {
  const ref: unknown = JSON.parse(String.fromCharCode(...bytes));
  // Only bytes produced by `encode` above reach here.
  return ref as ResultRef;
}
