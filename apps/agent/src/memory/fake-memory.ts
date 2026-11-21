import { err, ok } from "@nodomics/protocol";
import type { Edge, Entity, Episode, MemoryPort, NewEdge } from "./memory-port.ts";
import { edgesValidAt } from "./temporal-graph.ts";

type Store = {
  readonly episodes: readonly Episode[];
  readonly entities: ReadonlyMap<string, Entity>;
  readonly edges: readonly Edge[];
};

type StoreRef = { current: Store };

const done = Promise.resolve(ok(undefined));

const toEdge = (edge: NewEdge, id: string): Edge => ({
  id,
  actorId: edge.actorId,
  src: edge.src,
  dst: edge.dst,
  relation: edge.relation,
  validFrom: edge.at,
  validTo: null,
});

function recordEpisode(ref: StoreRef, episode: Episode): ReturnType<MemoryPort["recordEpisode"]> {
  if (ref.current.episodes.some((known) => known.id === episode.id)) {
    return Promise.resolve(
      err({ code: "STORE_FAILED", message: `Duplicate episode ${episode.id}` }),
    );
  }
  ref.current = { ...ref.current, episodes: [...ref.current.episodes, episode] };
  return done;
}

function openEdge(ref: StoreRef, edge: NewEdge): ReturnType<MemoryPort["openEdge"]> {
  const opened = toEdge(edge, `edge-${String(ref.current.edges.length + 1)}`);
  ref.current = { ...ref.current, edges: [...ref.current.edges, opened] };
  return Promise.resolve(ok(opened));
}

function closeEdge(
  ref: StoreRef,
  target: { id: string; at: string; actorId: string },
): ReturnType<MemoryPort["closeEdge"]> {
  const { id, at, actorId } = target;
  if (!ref.current.edges.some((edge) => edge.id === id && edge.actorId === actorId)) {
    return Promise.resolve(err({ code: "NOT_FOUND", message: `Unknown edge ${id}` }));
  }
  const edges = ref.current.edges.map((e) => (e.id === id ? { ...e, validTo: at } : e));
  ref.current = { ...ref.current, edges };
  return done;
}

function edgesAt(
  ref: StoreRef,
  query: { entityId: string; at: string; actorId: string },
): ReturnType<MemoryPort["edgesAt"]> {
  const { entityId, at, actorId } = query;
  const touching = ref.current.edges.filter(
    (e) => e.actorId === actorId && (e.src === entityId || e.dst === entityId),
  );
  return Promise.resolve(ok(edgesValidAt(touching, at)));
}

export function createFakeMemory(): MemoryPort {
  const ref: StoreRef = { current: { episodes: [], entities: new Map(), edges: [] } };
  return {
    recordEpisode: (episode) => recordEpisode(ref, episode),
    upsertEntity: (entity) => {
      ref.current = {
        ...ref.current,
        entities: new Map(ref.current.entities).set(entity.id, entity),
      };
      return done;
    },
    openEdge: (edge) => openEdge(ref, edge),
    closeEdge: (id, at, actorId) => closeEdge(ref, { id, at, actorId }),
    edgesAt: (entityId, at, actorId) => edgesAt(ref, { entityId, at, actorId }),
    episodesFor: (entityId) =>
      Promise.resolve(ok(ref.current.episodes.filter((e) => e.entityIds.includes(entityId)))),
  };
}
