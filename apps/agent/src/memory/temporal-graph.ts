import type { Edge } from "./memory-port.ts";

export type RelationChange = {
  readonly src: string;
  readonly relation: string;
  readonly newDst: string;
  readonly at: string;
};

const isCurrent = (edge: Edge, change: RelationChange): boolean =>
  edge.src === change.src && edge.relation === change.relation && edge.validTo === null;

const closeAt = (edge: Edge, at: string): Edge => ({ ...edge, validTo: at });

const openFrom = (change: RelationChange): Edge => ({
  id: `${change.src}:${change.relation}:${change.at}`,
  src: change.src,
  dst: change.newDst,
  relation: change.relation,
  validFrom: change.at,
  validTo: null,
});

export function changeRelation(edges: readonly Edge[], change: RelationChange): readonly Edge[] {
  const closed = edges.map((edge) => (isCurrent(edge, change) ? closeAt(edge, change.at) : edge));
  return [...closed, openFrom(change)];
}

export function edgesValidAt(edges: readonly Edge[], at: string): readonly Edge[] {
  return edges.filter(
    (edge) => edge.validFrom <= at && (edge.validTo === null || at < edge.validTo),
  );
}
