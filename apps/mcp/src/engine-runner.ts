import {
  createCoordinator,
  type Coordinator,
  type Fetch,
  type PresetSource,
} from "@nodomics/coordinator";
import { err, ok, type ExecutorPort, type Flow, type Result } from "@nodomics/protocol";
import { captureExecutorErrors } from "./capture-executor-errors.ts";
import { revisionOf } from "./flow-edit/index.ts";
import { createRunProjection, nodeErrorMessage, type RunProjection } from "./run-projection.ts";
import type { NodeRun, Runner, Sample } from "./runner.ts";
import type { StoreError } from "./stores.ts";

export type EngineRunnerDeps = {
  readonly createExecutors: () => Promise<{
    readonly executors: readonly ExecutorPort[];
    readonly dispose: () => void;
  }>;
  readonly catalog: Parameters<typeof createCoordinator>[0]["catalog"];
  readonly presetSources?: Readonly<Record<string, PresetSource>>;
  readonly fetch?: Fetch;
};
type Entry = {
  readonly coordinator: Coordinator;
  readonly projection: RunProjection;
  readonly dispose: () => void;
  hasRun: boolean;
};
const MAX_CACHED_REVISIONS = 4;
const RUN_TIMEOUT_MS = 120_000;
const RUN_REVISION = 1;
const SAMPLE_ROWS = 20;
const SAMPLE_BYTES = 64 * 1024;
export function createEngineRunner(deps: EngineRunnerDeps): Runner {
  const cache = new Map<string, Entry>();
  const serial = createSerialQueue();
  const entryFor = async (flow: Flow): Promise<Entry> => {
    const key = revisionOf(flow);
    const existing = cache.get(key);
    if (existing !== undefined) {
      cache.delete(key);
      cache.set(key, existing);
      return existing;
    }
    const entry = await createEntry(deps);
    cache.set(key, entry);
    evictOldest(cache);
    return entry;
  };
  return {
    run: (flow, upTo) =>
      serial(() => safe(async () => executeFlow(await entryFor(flow), flow, upTo))),
    sample: (flow, request) =>
      serial(() => safe(async () => sampleFlow(await entryFor(flow), flow, request))),
    logs: (flow, nodeId) =>
      serial(() => safe(async () => nodeLogs(await entryFor(flow), flow, nodeId))),
  };
}
async function createEntry(deps: EngineRunnerDeps): Promise<Entry> {
  const executors = await deps.createExecutors();
  const projection = createRunProjection();
  const coordinator = createCoordinator({
    executors: executors.executors.map((executor) => captureExecutorErrors(executor, projection)),
    catalog: deps.catalog,
    emit: projection.emit,
    ...(deps.presetSources === undefined ? {} : { presetSources: deps.presetSources }),
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
  });
  return {
    coordinator,
    projection,
    hasRun: false,
    dispose: () => {
      coordinator.dispose();
      executors.dispose();
    },
  };
}
function evictOldest(cache: Map<string, Entry>): void {
  if (cache.size <= MAX_CACHED_REVISIONS) return;
  const oldest = cache.entries().next().value;
  if (oldest !== undefined) {
    cache.delete(oldest[0]);
    oldest[1].dispose();
  }
}
async function executeFlow(
  entry: Entry,
  flow: Flow,
  upTo?: readonly string[],
): Promise<Result<{ readonly nodes: readonly NodeRun[] }, StoreError>> {
  entry.projection.reset();
  const setup = await entry.coordinator["flow.set"]({ rev: RUN_REVISION, flow });
  const finished = waitForFinish(entry.projection);
  const run = await entry.coordinator["flow.run"]({
    rev: RUN_REVISION,
    ...(upTo === undefined ? {} : { targets: [...upTo] }),
  });
  if (!(await finished.result)) {
    await entry.coordinator["run.cancel"]({ runId: run.runId });
    return err({ message: "Run timed out" });
  }
  finished.clear();
  entry.hasRun = true;
  if (entry.projection.control.failure !== undefined)
    return err({ message: entry.projection.control.failure });
  return ok({
    nodes: flow.nodes.map((node) =>
      projectNode(
        entry.projection,
        node.id,
        setup.errors.find((issue) => issue.nodeId === node.id)?.message,
      ),
    ),
  });
}
function waitForFinish(projection: RunProjection): { result: Promise<boolean>; clear: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = new Promise<boolean>((resolve) => {
    projection.control.finish = () => {
      clearTimeout(timer);
      resolve(true);
    };
    timer = setTimeout(() => {
      delete projection.control.finish;
      resolve(false);
    }, RUN_TIMEOUT_MS);
  });
  return {
    result,
    clear: () => {
      clearTimeout(timer);
      delete projection.control.finish;
    },
  };
}
function projectNode(projection: RunProjection, nodeId: string, issue?: string): NodeRun {
  const status = projection.statuses.get(nodeId);
  if (status?.state === "done" || status?.state === "cached")
    return { nodeId, status: "ok", error: null };
  if (status?.error !== undefined)
    return { nodeId, status: "error", error: nodeErrorMessage(status.error) };
  return issue === undefined
    ? { nodeId, status: "skipped", error: null }
    : { nodeId, status: "error", error: issue };
}
async function sampleFlow(
  entry: Entry,
  flow: Flow,
  request: { nodeId: string; port: string; page: number },
): Promise<Result<Sample, StoreError>> {
  if (!entry.hasRun || !entry.projection.statuses.has(request.nodeId)) {
    const result = await executeFlow(entry, flow, [request.nodeId]);
    if (!result.ok) return result;
  }
  const ref = entry.projection.results.get(`${request.nodeId}.${request.port}`);
  if (ref === undefined) {
    const failure = entry.projection.statuses.get(request.nodeId)?.error;
    return err({
      message:
        failure === undefined
          ? `No output ${request.nodeId}.${request.port}`
          : nodeErrorMessage(failure),
    });
  }
  const page = await entry.coordinator["data.page"]({
    ref: ref.id,
    offset: request.page * SAMPLE_ROWS,
    limit: SAMPLE_ROWS,
  });
  const rows = page.rows.map((row) =>
    Object.fromEntries(page.columns.map((column, index) => [column.name, row[index]])),
  );
  const trimmed = trimRows(rows);
  return ok({
    schema: { columns: page.columns },
    rows: trimmed,
    page: request.page,
    hasMore: trimmed.length < rows.length || request.page * SAMPLE_ROWS + rows.length < page.total,
  });
}
function trimRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  let count = rows.length;
  while (count > 0 && Buffer.byteLength(JSON.stringify(rows.slice(0, count))) > SAMPLE_BYTES)
    count -= 1;
  return rows.slice(0, count);
}
async function nodeLogs(
  entry: Entry,
  flow: Flow,
  nodeId: string,
): Promise<Result<{ nodeId: string; lines: readonly string[] }, StoreError>> {
  if (!flow.nodes.some((node) => node.id === nodeId))
    return err({ message: `Unknown node: ${nodeId}` });
  if (!entry.hasRun || !entry.projection.statuses.has(nodeId)) {
    const result = await executeFlow(entry, flow, [nodeId]);
    if (!result.ok) return result;
  }
  return ok({ nodeId, lines: entry.projection.logs.get(nodeId) ?? [] });
}
async function safe<T>(
  compute: () => Promise<Result<T, StoreError>>,
): Promise<Result<T, StoreError>> {
  try {
    return await compute();
  } catch (error) {
    return err({ message: error instanceof Error ? error.message : "Execution failed" });
  }
}
function createSerialQueue(): <T>(run: () => Promise<T>) => Promise<T> {
  let previous = Promise.resolve();
  return async (run) => {
    const before = previous;
    let release: () => void = () => undefined;
    previous = new Promise<void>((resolve) => {
      release = resolve;
    });
    await before;
    try {
      return await run();
    } finally {
      release();
    }
  };
}
