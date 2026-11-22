import type { Niche } from "./find-niches.ts";

type Point = { readonly x: number; readonly y: number };
export type Bubble = Point & { readonly id: string; readonly radius: number };
export type Dot = Point & { readonly handle: string; readonly nicheId: string };

/** The canvas is 16:10; every coordinate is a fraction of the width or the height. */
export const MAP_ASPECT = 1.6;
const CANVAS: Point = { x: MAP_ASPECT, y: 1 };
/** Share of the canvas the bubbles cover together; the rest is breathing room. */
const FILL = 0.42;
const MAX_RADIUS = 0.34;
const GAP = 0.035;
const RELAX_STEPS = 160;
const PULL = 0.02;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Members stay inside the bubble's rim, clear of the label. */
const INNER = 0.72;
const HALF = 0.5;
/** Separates two bubbles that start on the same spot. */
const NUDGE = 1e-3;

function radiiOf(niches: readonly Niche[]): number[] {
  const total = niches.reduce((sum, niche) => sum + niche.handles.length, 0);
  const area = CANVAS.x * CANVAS.y * FILL;
  return niches.map((niche) =>
    Math.min(MAX_RADIUS, Math.sqrt((area * niche.handles.length) / Math.max(total, 1) / Math.PI)),
  );
}

/** The mean projected position of each niche's members, spread over the canvas. */
function startsOf(niches: readonly Niche[], positions: ReadonlyMap<string, Point>): Point[] {
  return niches.map((niche) => {
    const points = niche.handles.map((handle) => positions.get(handle) ?? { x: HALF, y: HALF });
    const mean = (axis: keyof Point) =>
      points.reduce((sum, point) => sum + point[axis], 0) / Math.max(points.length, 1);
    return { x: mean("x") * CANVAS.x, y: mean("y") * CANVAS.y };
  });
}

function pushApart(centers: Point[], radii: readonly number[]): Point[] {
  return centers.map((center, index) =>
    centers.reduce((moved, other, j) => {
      if (j === index) return moved;
      const dx = moved.x - other.x || (index - j) * NUDGE;
      const dy = moved.y - other.y;
      const distance = Math.hypot(dx, dy);
      const overlap = (radii[index] ?? 0) + (radii[j] ?? 0) + GAP - distance;
      if (overlap <= 0) return moved;
      return {
        x: moved.x + (dx / distance) * overlap * HALF,
        y: moved.y + (dy / distance) * overlap * HALF,
      };
    }, center),
  );
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), Math.max(low, high));

function settle(center: Point, radius: number): Point {
  const pulled = {
    x: center.x + (CANVAS.x * HALF - center.x) * PULL,
    y: center.y + (CANVAS.y * HALF - center.y) * PULL,
  };
  return {
    x: clamp(pulled.x, radius, CANVAS.x - radius),
    y: clamp(pulled.y, radius, CANVAS.y - radius),
  };
}

function relax(starts: readonly Point[], radii: readonly number[]): Point[] {
  let centers = [...starts];
  for (let step = 0; step < RELAX_STEPS; step += 1) {
    centers = pushApart(centers, radii).map((center, index) => settle(center, radii[index] ?? 0));
  }
  return centers;
}

/** A sunflower spiral: evenly spread points inside a circle, the first ones at its heart. */
function spiral(bubble: Bubble, count: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const distance = bubble.radius * INNER * Math.sqrt((index + HALF) / count);
    const angle = index * GOLDEN_ANGLE;
    return { x: bubble.x + distance * Math.cos(angle), y: bubble.y + distance * Math.sin(angle) };
  });
}

/**
 * Lays the niches out as non-overlapping bubbles near where their members sit on the
 * affinity projection, sized by their member count, with the members spread inside.
 */
export function layoutNiches(
  niches: readonly Niche[],
  positions: ReadonlyMap<string, Point>,
): { readonly bubbles: readonly Bubble[]; readonly dots: readonly Dot[] } {
  const radii = radiiOf(niches);
  const centers = relax(startsOf(niches, positions), radii);
  const bubbles = niches.map((niche, index) => ({
    id: niche.id,
    radius: radii[index] ?? 0,
    ...(centers[index] ?? { x: 0, y: 0 }),
  }));
  const dots = niches.flatMap((niche, index) => {
    const bubble = bubbles[index];
    if (bubble === undefined) return [];
    const points = spiral(bubble, niche.handles.length);
    return niche.handles.map((handle, member) => ({
      handle,
      nicheId: niche.id,
      ...(points[member] ?? bubble),
    }));
  });
  return { bubbles, dots };
}
