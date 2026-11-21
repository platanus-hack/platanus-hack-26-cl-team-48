import type {
  ExecutorCapabilities,
  ExecutorPort,
  NepMethod,
  NepParams,
  NepResult,
  NodeManifest,
} from "@nodomics/protocol";
import { toCatalog } from "./catalog.ts";
import { completeCode } from "./complete-code.ts";
import { displayData, pageData, profileData } from "./data-requests.ts";
import type { Fetch } from "./fetch-request.ts";
import type { Emit, EngineState, PresetSource } from "./engine-state.ts";
import { cancelRun, setFlow, startRun } from "./flow-session.ts";
import { inferSchema } from "./infer-schema.ts";
import { createResultStore } from "./result-store.ts";
import { addSource } from "./source-loading.ts";
import { viewData } from "./view-data.ts";

/** The NEP methods the coordinator serves; `engine.hello` belongs to whoever assembles the engine. */
export const SERVED_METHODS = [
  "nodes.list",
  "nodes.register",
  "source.add",
  "flow.set",
  "flow.run",
  "run.cancel",
  "schema.infer",
  "data.page",
  "data.profile",
  "data.view",
  "data.display",
  "code.complete",
] as const satisfies ReadonlyArray<NepMethod>;

export type ServedMethod = (typeof SERVED_METHODS)[number];

export type NepHandlers = {
  readonly [M in ServedMethod]: (params: NepParams<M>) => Promise<NepResult<M>>;
};

export type Coordinator = NepHandlers & {
  /** Stops listening to the executors' logs. */
  readonly dispose: () => void;
};

export type CoordinatorDeps = {
  readonly executors: ReadonlyArray<ExecutorPort>;
  readonly catalog: ReadonlyArray<NodeManifest>;
  readonly emit: Emit;
  readonly now?: () => number;
  readonly createId?: (prefix: string) => string;
  readonly presetSources?: Readonly<Record<string, PresetSource>>;
  /** How API sources are asked for (ADR 0017); without it they fail with an error. */
  readonly fetch?: Fetch;
};

export function createCoordinator(deps: CoordinatorDeps): Coordinator {
  const state = createEngineState(deps);
  const stopForwarding = forwardExecutorLogs(state);
  return {
    ...createHandlers(state),
    dispose: () => {
      stopForwarding.forEach((stop) => {
        stop();
      });
    },
  };
}

const createHandlers = (state: EngineState): NepHandlers => ({
  "nodes.list": () => Promise.resolve({ nodes: [...state.catalog.values()] }),
  "nodes.register": ({ nodes }) => {
    nodes.forEach((manifest) => state.catalog.set(manifest.id, manifest));
    return Promise.resolve({});
  },
  "source.add": (params) => addSource(state, params),
  "flow.set": (params) => settle(() => setFlow(state, params)),
  "flow.run": (params) => settle(() => startRun(state, params)),
  "run.cancel": (params) =>
    settle(() => {
      cancelRun(state, params);
      return {};
    }),
  "schema.infer": (params) => inferSchema(state, params),
  "data.page": (params) => pageData(state, params),
  "data.profile": (params) => profileData(state, params),
  "data.view": (params) => viewData(state, params),
  "data.display": (params) => displayData(state, params),
  "code.complete": (params) => completeCode(state, params),
});

/** Runs a synchronous handler so that a thrown RpcError rejects the request instead of escaping. */
const settle = <T>(compute: () => T): Promise<T> =>
  new Promise((resolve) => {
    resolve(compute());
  });

function createEngineState(deps: CoordinatorDeps): EngineState {
  const ids = { next: 0 };
  const hello: { current?: Promise<ReadonlyArray<ExecutorCapabilities>> } = {};
  return {
    executors: deps.executors,
    capabilities: () =>
      (hello.current ??= Promise.all(
        deps.executors.map((executor) => executor.request("exec.hello", {})),
      )),
    emit: deps.emit,
    now: deps.now ?? (() => Date.now()),
    createId: deps.createId ?? ((prefix) => `${prefix}_${String((ids.next += 1))}`),
    catalog: new Map(toCatalog(deps.catalog)),
    store: createResultStore(),
    sources: new Map(),
    presetSources: deps.presetSources ?? {},
    fetch: deps.fetch,
    tasks: new Map(),
    runs: new Map(),
    session: { current: undefined },
  };
}

const forwardExecutorLogs = (state: EngineState): Array<() => void> =>
  state.executors.map((executor) =>
    executor.onLog((log) => {
      const owner = state.tasks.get(log.taskId);
      if (owner !== undefined)
        state.emit("run.log", { ...owner, level: log.level, message: log.message });
    }),
  );
