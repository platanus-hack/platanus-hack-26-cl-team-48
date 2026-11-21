import {
  NepNotifications,
  parse,
  type Flow,
  type NepEvent,
  type NepEventPayload,
  type NodeManifest,
} from "@nodomics/protocol";
import { createCoordinator, type CoordinatorDeps } from "../coordinator.ts";
import { coreCatalog } from "./catalog-fixtures.ts";
import { createFakeExecutor, type FakeExecutorOptions } from "./fake-executor.ts";

const CLOCK_STEP_MS = 5;

export type HarnessOptions = {
  readonly sqlRowCount?: number;
  readonly failWhen?: FakeExecutorOptions["failWhen"];
  readonly logWhileRunning?: string;
  readonly loadError?: FakeExecutorOptions["loadError"];
  readonly catalog?: ReadonlyArray<NodeManifest>;
  readonly presetSources?: CoordinatorDeps["presetSources"];
  readonly pythonFiguresPerTask?: number;
  readonly fetch?: CoordinatorDeps["fetch"];
};

type Emitted = { readonly event: NepEvent; readonly payload: unknown };

/** A coordinator wired to a SQL fake executor and a Python fake executor, recording its events. */
export function createHarness(options: HarnessOptions = {}) {
  const sql = createFakeExecutor({
    capabilities: { executor: "fake-sql", runtimes: ["sql"] },
    ...(options.sqlRowCount === undefined ? {} : { rowCount: options.sqlRowCount }),
    ...(options.failWhen === undefined ? {} : { failWhen: options.failWhen }),
    ...(options.logWhileRunning === undefined ? {} : { logWhileRunning: options.logWhileRunning }),
    ...(options.loadError === undefined ? {} : { loadError: options.loadError }),
  });
  const python = createFakeExecutor({
    capabilities: { executor: "fake-py", runtimes: ["python"], packages: ["pandas"] },
    ...(options.pythonFiguresPerTask === undefined
      ? {}
      : { figuresPerTask: options.pythonFiguresPerTask }),
  });
  const emitted: Emitted[] = [];
  const finishWaiters = new Map<string, () => void>();
  const clock = { now: 0 };
  const ids = { next: 0 };
  const coordinator = createCoordinator({
    executors: [sql, python],
    catalog: options.catalog ?? coreCatalog,
    emit: (event, payload) => {
      emitted.push({ event, payload });
      if (event === "run.finished") finishWaiters.get(payload.runId)?.();
    },
    now: () => (clock.now += CLOCK_STEP_MS),
    createId: (prefix) => `${prefix}-${String((ids.next += 1))}`,
    ...(options.presetSources === undefined ? {} : { presetSources: options.presetSources }),
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });

  const events = <E extends NepEvent>(event: E): Array<NepEventPayload<E>> =>
    emitted
      .filter((entry) => entry.event === event)
      .map((entry) => parseEvent(event, entry.payload));

  /** Resolves once `run.finished` was emitted for the run. */
  const finished = (runId: string): Promise<void> =>
    new Promise((resolve) => {
      if (events("run.finished").some((entry) => entry.runId === runId)) resolve();
      else finishWaiters.set(runId, resolve);
    });

  /** Starts a run and resolves with its runId once it finished. */
  const run = async (rev: number, targets?: string[]): Promise<string> => {
    const { runId } = await coordinator["flow.run"](
      targets === undefined ? { rev } : { rev, targets },
    );
    await finished(runId);
    return runId;
  };

  const setAndRun = async (flow: Flow, rev: number): Promise<string> => {
    await coordinator["flow.set"]({ rev, flow });
    return run(rev);
  };

  const statesOf = (runId: string, nodeId: string) =>
    events("node.status")
      .filter((status) => status.runId === runId && status.nodeId === nodeId)
      .map((status) => status.state);

  return { sql, python, coordinator, events, finished, run, setAndRun, statesOf };
}

function parseEvent<E extends NepEvent>(event: E, payload: unknown): NepEventPayload<E> {
  const parsed = parse(NepNotifications[event], payload);
  if (!parsed.ok)
    throw new Error(`Emitted ${event} breaks the protocol: ${JSON.stringify(parsed.error)}`);
  return parsed.value;
}
