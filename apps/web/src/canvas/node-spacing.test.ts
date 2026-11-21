import { describe, expect, it } from "vitest";
import { COLUMN_SPACING, ROW_SPACING, spaceOutNodes } from "./node-spacing.ts";

const SIZE = { width: 360, height: 300 };

const box = (id: string, x: number, y: number) => ({ id, position: { x, y }, size: SIZE });

describe("spaceOutNodes", () => {
  it("keeps nodes that do not touch where the flow put them", () => {
    const spaced = spaceOutNodes([box("a", 0, 0), box("b", 500, 0)], new Set());

    expect(spaced.get("a")).toEqual({ x: 0, y: 0 });
    expect(spaced.get("b")).toEqual({ x: 500, y: 0 });
  });

  it("respects the gaps the flow chose, however small, as long as nodes do not touch", () => {
    const spaced = spaceOutNodes([box("a", 0, 0), box("b", SIZE.width + 20, 0)], new Set());

    expect(spaced.get("b")).toEqual({ x: SIZE.width + 20, y: 0 });
  });

  it("leaves room for a connection and its size between columns", () => {
    expect(COLUMN_SPACING).toBeGreaterThan(ROW_SPACING);
  });

  it("pushes a node to the right of the one it overlaps on its left", () => {
    const spaced = spaceOutNodes([box("b", 260, 40), box("a", 0, 0)], new Set());

    expect(spaced.get("a")).toEqual({ x: 0, y: 0 });
    expect(spaced.get("b")).toEqual({ x: SIZE.width + COLUMN_SPACING, y: 40 });
  });

  it("pushes a node below the one it overlaps in its column", () => {
    const spaced = spaceOutNodes([box("a", 0, 0), box("b", 0, 220)], new Set());

    expect(spaced.get("b")).toEqual({ x: 0, y: SIZE.height + ROW_SPACING });
  });

  it("moves a whole column right, and stacks its nodes, when the column before grows", () => {
    const spaced = spaceOutNodes(
      [box("a", 0, 0), box("b", 260, 0), box("c", 260, 220), box("d", 520, 0)],
      new Set(),
    );

    const columnX = SIZE.width + COLUMN_SPACING;
    expect(spaced.get("b")).toEqual({ x: columnX, y: 0 });
    expect(spaced.get("c")).toEqual({ x: columnX, y: SIZE.height + ROW_SPACING });
    expect(spaced.get("d")).toEqual({ x: columnX + SIZE.width + COLUMN_SPACING, y: 0 });
  });

  it("never moves a pinned node, such as the one being dragged", () => {
    const spaced = spaceOutNodes([box("a", 0, 0), box("b", 100, 0)], new Set(["b"]));

    expect(spaced.get("b")).toEqual({ x: 100, y: 0 });
    expect(spaced.get("a")).toEqual({ x: 0, y: SIZE.height + ROW_SPACING });
  });

  it("leaves nodes without a measured size in place and out of the way of others", () => {
    const spaced = spaceOutNodes(
      [{ id: "a", position: { x: 0, y: 0 } }, box("b", 10, 10)],
      new Set(),
    );

    expect(spaced.get("a")).toEqual({ x: 0, y: 0 });
    expect(spaced.get("b")).toEqual({ x: 10, y: 10 });
  });
});
