import type { DisplayRef, ResultRef } from "@nodomics/protocol";

/** What a node run left on its executor: its outputs by port and the figures it showed. */
export type NodeRun = {
  readonly outputs: Readonly<Record<string, ResultRef>>;
  readonly displays: ReadonlyArray<DisplayRef>;
};

/** A node run and the executor that holds it. */
export type CachedResult = NodeRun & { readonly executor: number };

/** A result and the executor that holds it. */
export type LocatedResult = { readonly executor: number; readonly ref: ResultRef };

/** Any id an executor holds for a cached entry: a result or a figure. */
type HeldId = { readonly executor: number; readonly id: string };

/** Result ids to release, grouped by the executor that holds them. */
export type Evictions = ReadonlyMap<number, ReadonlyArray<string>>;

export type ResultStore = {
  readonly has: (key: string) => boolean;
  readonly get: (key: string) => CachedResult | undefined;
  readonly put: (key: string, result: CachedResult) => Evictions;
  /** Registers a result that is not a node output, such as a loaded source. */
  readonly remember: (located: LocatedResult) => void;
  readonly locate: (resultId: string) => number | undefined;
  readonly copyOf: (resultId: string, executor: number) => ResultRef | undefined;
  readonly putCopy: (resultId: string, copy: LocatedResult) => void;
  /** Forgets every cached node result whose key is not kept, with its copies on other executors. */
  readonly evictExcept: (keys: ReadonlySet<string>) => Evictions;
};

/** Content-addressed cache of node results, plus where every result id lives. */
export function createResultStore(): ResultStore {
  const entries = new Map<string, CachedResult>();
  const locations = new Map<string, number>();
  const copies = new Map<string, Map<number, ResultRef>>();
  const remember = ({ executor, ref }: LocatedResult) => {
    locations.set(ref.id, executor);
  };
  const forget = (held: HeldId): HeldId[] => {
    const copied = [...(copies.get(held.id) ?? [])].map(([executor, ref]) => ({
      executor,
      id: ref.id,
    }));
    [held, ...copied].forEach(({ id }) => locations.delete(id));
    copies.delete(held.id);
    return [held, ...copied];
  };
  return {
    has: (key) => entries.has(key),
    get: (key) => entries.get(key),
    put: (key, result) => {
      const retained = new Set(heldIds(result).map(({ id }) => id));
      const replaced = heldIds(entries.get(key))
        .filter(({ id }) => !retained.has(id))
        .flatMap(forget);
      entries.set(key, result);
      heldIds(result).forEach(({ executor, id }) => locations.set(id, executor));
      return groupByExecutor(replaced);
    },
    remember,
    locate: (resultId) => locations.get(resultId),
    copyOf: (resultId, executor) => copies.get(resultId)?.get(executor),
    putCopy: (resultId, copy) => {
      copies.set(
        resultId,
        (copies.get(resultId) ?? new Map<number, ResultRef>()).set(copy.executor, copy.ref),
      );
      remember(copy);
    },
    evictExcept: (keys) => {
      const evicted = [...entries].filter(([key]) => !keys.has(key));
      evicted.forEach(([key]) => entries.delete(key));
      return groupByExecutor(evicted.flatMap(([, result]) => heldIds(result).flatMap(forget)));
    },
  };
}

const heldIds = (result: CachedResult | undefined): HeldId[] =>
  result === undefined
    ? []
    : [...Object.values(result.outputs), ...result.displays].map(({ id }) => ({
        executor: result.executor,
        id,
      }));

function groupByExecutor(held: ReadonlyArray<HeldId>): Evictions {
  const groups = new Map<number, string[]>();
  held.forEach(({ executor, id }) => {
    groups.set(executor, [...(groups.get(executor) ?? []), id]);
  });
  return groups;
}
