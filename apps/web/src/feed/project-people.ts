type Point = { readonly x: number; readonly y: number };
type Vector = readonly number[];

const ITERATIONS = 80;
const EPSILON = 1e-12;
const CENTER = 0.5;

// Plain loops: these run many times over vectors of about a thousand numbers.
function dot(left: Vector, right: Vector): number {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return sum;
}

/** The rows added up, each scaled by its weight. */
function weightedSum(rows: readonly Vector[], weights: readonly number[], size: number): number[] {
  const sum = new Array<number>(size).fill(0);
  rows.forEach((row, rowIndex) => {
    const weight = weights[rowIndex] ?? 0;
    for (let index = 0; index < size; index += 1)
      sum[index] = (sum[index] ?? 0) + (row[index] ?? 0) * weight;
  });
  return sum;
}

function centered(vectors: readonly Vector[]): Vector[] {
  const mean = (vectors[0] ?? []).map(
    (_, index) => vectors.reduce((sum, vector) => sum + (vector[index] ?? 0), 0) / vectors.length,
  );
  return vectors.map((vector) => mean.map((value, index) => (vector[index] ?? 0) - value));
}

function principalDirection(rows: readonly Vector[]): Vector {
  let direction: Vector = [];
  for (const row of rows) {
    if (dot(row, row) > dot(direction, direction)) direction = row;
  }
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const weights = rows.map((row) => dot(row, direction));
    const next = weightedSum(rows, weights, direction.length);
    const norm = Math.sqrt(dot(next, next));
    if (norm < EPSILON) return [];
    direction = next.map((value) => value / norm);
  }
  return direction;
}

/** Scores on the first two principal axes, using one scale to preserve distances. */
export function projectPeople(vectors: readonly Vector[]): readonly Point[] {
  const rows = centered(vectors);
  const first = principalDirection(rows);
  const x = rows.map((row) => dot(first, row));
  const residual = rows.map((row, index) =>
    row.map((value, column) => value - (x[index] ?? 0) * (first[column] ?? 0)),
  );
  const second = principalDirection(residual);
  const y = residual.map((row) => dot(second, row));
  const scale = Math.max(EPSILON, ...x.map(Math.abs), ...y.map(Math.abs));
  return x.map((score, index) => ({
    x: CENTER + (CENTER * score) / scale,
    y: CENTER + (CENTER * (y[index] ?? 0)) / scale,
  }));
}
