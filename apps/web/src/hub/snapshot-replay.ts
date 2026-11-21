import {
  decodeFigure,
  encodeFigure,
  SNAPSHOT_FORMAT,
  type Snapshot,
  type SnapshotState,
} from "@nodomics/hub";
import type { DataPage, Flow, FlowNode, NodeManifest, SortSpec } from "@nodomics/protocol";
import { createEngineState, type EngineState } from "../engine/engine-state.ts";
import type { EngineSession, PageRequest } from "../engine/engine-session.ts";
import { PAGE_SIZE } from "../preview/preview-model.ts";

type Recording = {
  readonly flow: Flow;
  readonly engine: EngineState;
  readonly session: EngineSession;
  readonly includeState: boolean;
};

/** What a published flow carries so its preview works without an engine (ADR 0018). */
export async function recordSnapshot(recording: Recording): Promise<Snapshot> {
  const catalog = usedManifests(recording.flow, recording.engine.catalog);
  return {
    format: SNAPSHOT_FORMAT,
    catalog,
    ...(recording.includeState ? { state: await recordState(recording, catalog) } : {}),
  };
}

function usedManifests(flow: Flow, catalog: ReadonlyArray<NodeManifest>): NodeManifest[] {
  const nodes: ReadonlyArray<FlowNode> = [
    ...flow.nodes,
    ...(flow.customNodes ?? []).flatMap(({ impl }) =>
      impl.kind === "flow" ? impl.graph.nodes : [],
    ),
  ];
  const types = new Set(nodes.map(({ type }) => type));
  return catalog.filter(({ id }) => types.has(id));
}

async function recordState(
  { flow, engine, session }: Recording,
  catalog: ReadonlyArray<NodeManifest>,
): Promise<SnapshotState> {
  const refs = Object.values(engine.results).flatMap((ports) => Object.values(ports));
  const viewNodes = flow.nodes.filter(
    (node) => catalog.find(({ id }) => id === node.type)?.impl.kind === "view",
  );
  const displays = Object.values(engine.displays).flat();
  const [pages, profiles, views, figures] = await Promise.all([
    answers(
      refs.map(({ id }) => id),
      (ref) => session.page(ref, { offset: 0, limit: PAGE_SIZE }),
    ),
    answers(
      refs.map(({ id }) => id),
      (ref) => session.profile(ref),
    ),
    answers(
      viewNodes.map(({ id }) => id),
      (nodeId) => session.view(nodeId),
    ),
    answers(
      displays.map(({ id }) => id),
      async (id) => encodeFigure(await session.display(id)),
    ),
  ]);
  return {
    nodes: Object.fromEntries(
      Object.entries(engine.nodes).map(([id, run]) => [
        id,
        { state: run.state, ...(run.error === undefined ? {} : { error: run.error }) },
      ]),
    ),
    results: engine.results,
    displays: mapValues(engine.displays, (refs) => [...refs]),
    schemas: mapValues(engine.schemas, (ports) => mapValues(ports, (columns) => [...columns])),
    pages,
    profiles,
    views,
    figures,
  };
}

const mapValues = <T, U>(record: Readonly<Record<string, T>>, map: (value: T) => U) =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, map(value)]));

/** Each key's answer; a question the engine cannot answer any more is left out, not fatal. */
async function answers<T>(
  keys: ReadonlyArray<string>,
  ask: (key: string) => Promise<T>,
): Promise<Record<string, T>> {
  const settled = await Promise.allSettled(keys.map(ask));
  return Object.fromEntries(
    settled.flatMap((outcome, index) =>
      outcome.status === "fulfilled" ? [[keys[index] ?? "", outcome.value]] : [],
    ),
  );
}

/** The engine's mirror as it was when the snapshot was taken. */
export function snapshotEngineState(snapshot: Snapshot): EngineState {
  const state = snapshot.state;
  return {
    ...createEngineState(),
    catalog: snapshot.catalog,
    ...(state === undefined
      ? {}
      : {
          nodes: state.nodes,
          results: state.results,
          displays: state.displays,
          schemas: state.schemas,
        }),
  };
}

/** A read-only engine session that answers the preview from a snapshot instead of an engine. */
export function createReplaySession(snapshot: Snapshot): EngineSession {
  const state = snapshot.state;
  const recorded = <T>(value: T | undefined, what: string): Promise<T> =>
    value === undefined
      ? Promise.reject(new Error(`${what} was not recorded`))
      : Promise.resolve(value);
  return {
    start: () => Promise.resolve(),
    submitFlow: () => Promise.resolve(),
    run: () => Promise.resolve(),
    inferSchema: () => Promise.resolve(),
    page: (ref, request) =>
      recorded(state?.pages[ref], `Page of ${ref}`).then((page) => pageOf(page, request)),
    profile: (ref) => recorded(state?.profiles[ref], `Profile of ${ref}`),
    view: (nodeId) => recorded(state?.views[nodeId], `View of ${nodeId}`),
    display: (id) => recorded(state?.figures[id], `Figure ${id}`).then(decodeFigure),
    complete: () => Promise.resolve({ items: [] }),
    addSource: () => Promise.reject(new Error("A published flow cannot load files")),
    registerNodes: () => Promise.resolve(),
    close: () => undefined,
  };
}

function pageOf(page: DataPage, { offset, limit, sort }: PageRequest): DataPage {
  const rows = sort === undefined ? page.rows : sortRows(page, sort);
  return {
    columns: page.columns,
    rows: rows.slice(offset, offset + limit),
    total: page.rows.length,
  };
}

function sortRows(page: DataPage, { column, direction }: SortSpec): DataPage["rows"] {
  const index = page.columns.findIndex(({ name }) => name === column);
  const sign = direction === "asc" ? 1 : -1;
  return [...page.rows].sort((left, right) => compareCells(left[index], right[index], sign));
}

/** Empty cells go last in both directions, as the engine sorts them. */
function compareCells(left: unknown, right: unknown, sign: number): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  return (
    sign *
    (typeof left === "number" && typeof right === "number"
      ? left - right
      : cellText(left).localeCompare(cellText(right)))
  );
}

const cellText = (cell: unknown) => (typeof cell === "string" ? cell : JSON.stringify(cell));
