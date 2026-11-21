import { describe, expect, it } from "vitest";
import { computeEdgeGeometry } from "./edge-geometry.ts";

describe("computeEdgeGeometry", () => {
  it("draws a horizontal-tangent curve from the output port to the input port", () => {
    const { path } = computeEdgeGeometry({ x: 0, y: 0 }, { x: 200, y: 50 }, 12);

    expect(path).toBe("M0,0 C100,0 100,50 200,50");
  });

  it("keeps the handles open on short connections", () => {
    const { path } = computeEdgeGeometry({ x: 0, y: 0 }, { x: 20, y: 0 }, 12);

    expect(path).toBe("M0,0 C40,0 -20,0 20,0");
  });

  it("frames both ends with the given padding", () => {
    const { box } = computeEdgeGeometry({ x: 100, y: 80 }, { x: 10, y: 20 }, 12);

    expect(box).toEqual({ x: -2, y: 8, width: 114, height: 84 });
  });

  it("finds the middle of the connection", () => {
    const { midpoint } = computeEdgeGeometry({ x: 0, y: 0 }, { x: 100, y: 40 }, 12);

    expect(midpoint).toEqual({ x: 50, y: 20 });
  });
});
