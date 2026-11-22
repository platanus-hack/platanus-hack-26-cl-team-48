type Vector = readonly number[];
/** Cosine similarity between every pair of vectors. */
type Similarities = readonly Vector[];

const ITERATIONS = 30;
const EPSILON = 1e-12;
/** Each group should hold about two people, so a pair never splits into two lonely groups. */
const PEOPLE_PER_GROUP = 2;

// A plain loop: this runs n² times over vectors of about a thousand numbers.
function dot(left: Vector, right: Vector): number {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return sum;
}

function normalized(vector: Vector): Vector {
  const norm = Math.sqrt(dot(vector, vector));
  return norm < EPSILON ? vector.map(() => 0) : vector.map((value) => value / norm);
}

function similaritiesOf(vectors: readonly Vector[]): Similarities {
  const rows = vectors.map(normalized);
  return rows.map((row) => rows.map((other) => dot(row, other)));
}

const sumOver = (row: Vector | undefined, members: readonly number[]) =>
  members.reduce((sum, member) => sum + (row?.[member] ?? 0), 0);

const membersOf = (groups: readonly number[], group: number) =>
  groups.flatMap((g, index) => (g === group ? [index] : []));

const argMax = (scores: readonly number[]) =>
  scores.reduce((best, score, index) => (score > (scores[best] ?? -Infinity) ? index : best), 0);

/** Farthest-first seeds: deterministic and spread across the groups. */
function seeds(similarities: Similarities, count: number): number[] {
  const chosen = [
    argMax(
      similarities.map(
        (row) =>
          -sumOver(
            row,
            row.map((_, j) => j),
          ),
      ),
    ),
  ];
  while (chosen.length < count) {
    chosen.push(argMax(similarities.map((row) => -Math.max(...chosen.map((s) => row[s] ?? 0)))));
  }
  return chosen;
}

/** Similarity of each vector to each group's mean direction, from the similarities alone. */
function closeness(similarities: Similarities, groups: readonly number[], count: number) {
  const members = Array.from({ length: count }, (_, group) => membersOf(groups, group));
  const spread = members.map((group) =>
    Math.sqrt(group.reduce((sum, member) => sum + sumOver(similarities[member], group), 0)),
  );
  return similarities.map((row) =>
    members.map((group, index) =>
      group.length === 0 ? -Infinity : sumOver(row, group) / Math.max(spread[index] ?? 0, EPSILON),
    ),
  );
}

/** Spherical k-means run on the similarities, so its cost does not grow with the dimension. */
function kMeans(similarities: Similarities, count: number): number[] {
  const starts = seeds(similarities, count);
  let groups = similarities.map((row) => argMax(starts.map((seed) => row[seed] ?? 0)));
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const next = closeness(similarities, groups, count).map(argMax);
    if (next.every((group, index) => group === groups[index])) break;
    groups = next;
  }
  return groups;
}

/** Mean silhouette over cosine distance: how well separated the groups are (-1 to 1). */
function silhouette(similarities: Similarities, groups: readonly number[]): number {
  const ids = [...new Set(groups)];
  const members = new Map(ids.map((group) => [group, membersOf(groups, group)]));
  const scores = groups.map((group, index) => {
    const meanDistance = (other: number, size: number) =>
      1 - sumOver(similarities[index], members.get(other) ?? []) / size;
    const ownSize = (members.get(group)?.length ?? 1) - 1;
    if (ownSize === 0) return 0;
    // The own group's sum includes the vector itself, which must not count.
    const own = meanDistance(group, ownSize) + (similarities[index]?.[index] ?? 0) / ownSize;
    const closest = Math.min(
      ...ids.filter((g) => g !== group).map((g) => meanDistance(g, members.get(g)?.length ?? 1)),
    );
    return (closest - own) / Math.max(closest, own, EPSILON);
  });
  return scores.reduce((sum, score) => sum + score, 0) / Math.max(scores.length, 1);
}

/**
 * Groups the vectors by cosine similarity and returns each vector's group index.
 * The number of groups (up to `maxGroups`) is the one that separates them best.
 */
export function clusterVectors(vectors: readonly Vector[], maxGroups: number): number[] {
  const limit = Math.min(maxGroups, Math.floor(vectors.length / PEOPLE_PER_GROUP));
  if (limit < 2) return vectors.map(() => 0);
  const similarities = similaritiesOf(vectors);
  const candidates = Array.from({ length: limit - 1 }, (_, index) =>
    kMeans(similarities, index + 2),
  );
  return candidates.reduce((best, groups) =>
    silhouette(similarities, groups) > silhouette(similarities, best) ? groups : best,
  );
}
