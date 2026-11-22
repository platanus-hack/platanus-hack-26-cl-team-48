import { assert, describe, expect, it } from "vitest";
import { projectPeople } from "./project-people.ts";

describe("projectPeople", () => {
  it("returns no points for an empty input", () => {
    const points = projectPeople([]);

    expect(points).toEqual([]);
  });

  it("centers a single profile", () => {
    const points = projectPeople([[3, 9, -2]]);

    expect(points).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it("centers coincident profiles", () => {
    const vector = [3, 9, -2];

    const points = projectPeople([vector, vector, vector]);

    expect(points).toEqual(Array.from({ length: 3 }, () => ({ x: 0.5, y: 0.5 })));
  });

  it("keeps opposite points symmetric around the center of each axis", () => {
    const vectors = [
      [13, 2],
      [7, 2],
      [10, 3],
      [10, 1],
    ];

    const [right, left, top, bottom] = projectPeople(vectors);

    assert(right && left && top && bottom);
    expect(right.x + left.x).toBeCloseTo(1);
    expect(right.y + left.y).toBeCloseTo(1);
    expect(top.x + bottom.x).toBeCloseTo(1);
    expect(top.y + bottom.y).toBeCloseTo(1);
    expect(Math.abs(right.x - left.x)).toBeGreaterThan(0);
    expect(Math.abs(top.y - bottom.y)).toBeGreaterThan(0);
  });

  it("returns finite normalized coordinates for points on a line", () => {
    const vectors = [
      [-2, 4, 0],
      [0, 0, 0],
      [2, -4, 0],
    ];

    const points = projectPeople(vectors);

    expect(points).toHaveLength(vectors.length);
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeCloseTo(0.5);
    }
    const [first, , last] = points;
    assert(first && last);
    expect(first.x).not.toBeCloseTo(last.x);
  });

  it("projects the same vectors consistently", () => {
    const vectors = [
      [2, 3, 0],
      [1, -2, 8],
      [4, 0, 1],
    ];

    const first = projectPeople(vectors);
    const second = projectPeople(vectors);

    expect(first).toEqual(second);
  });
});
