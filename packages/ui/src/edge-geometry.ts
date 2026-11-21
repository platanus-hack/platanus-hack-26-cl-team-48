import type { Point } from "./types.ts";

const MIN_HANDLE_LENGTH = 40;
const HANDLE_RATIO = 0.5;

export type EdgeGeometry = {
  readonly path: string;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly midpoint: Point;
};

export function computeEdgeGeometry(from: Point, to: Point, padding: number): EdgeGeometry {
  return {
    path: curveBetween(from, to),
    box: {
      x: Math.min(from.x, to.x) - padding,
      y: Math.min(from.y, to.y) - padding,
      width: Math.abs(to.x - from.x) + 2 * padding,
      height: Math.abs(to.y - from.y) + 2 * padding,
    },
    midpoint: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
  };
}

// Ports sit on the left and right sides of a node, so the curve leaves and enters horizontally.
function curveBetween(from: Point, to: Point): string {
  const handle = Math.max(MIN_HANDLE_LENGTH, Math.abs(to.x - from.x) * HANDLE_RATIO);
  return `M${point(from)} C${point({ x: from.x + handle, y: from.y })} ${point({ x: to.x - handle, y: to.y })} ${point(to)}`;
}

function point({ x, y }: Point): string {
  return `${String(x)},${String(y)}`;
}
