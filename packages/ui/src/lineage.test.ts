import { describe, expect, it } from "vitest";
import { glyphPaths, segmentsFor, type LineageEvent, type LineageSegment } from "./lineage.ts";

describe("segmentsFor", () => {
  it("divides available width equally among lineage events in chronological order", () => {
    const events: LineageEvent[] = ["origin", "adapt", "agent"];
    const totalWidth = 300;

    const segments: LineageSegment[] = segmentsFor(events, totalWidth);

    expect(segments).toEqual([
      { kind: "origin", x1: 0, x2: 100 },
      { kind: "adapt", x1: 100, x2: 200 },
      { kind: "agent", x1: 200, x2: 300 },
    ]);
  });

  it("returns an empty array when given an empty list of events", () => {
    const events: LineageEvent[] = [];
    const totalWidth = 300;

    const segments: LineageSegment[] = segmentsFor(events, totalWidth);

    expect(segments).toEqual([]);
  });

  it("spans the full width for a single lineage event", () => {
    const events: LineageEvent[] = ["origin"];
    const totalWidth = 300;

    const segments: LineageSegment[] = segmentsFor(events, totalWidth);

    expect(segments).toEqual([{ kind: "origin", x1: 0, x2: 300 }]);
  });
});

describe("glyphPaths", () => {
  it("exports glyph path definitions", () => {
    const paths = glyphPaths;

    const pathCount = Object.keys(paths).length;

    expect(pathCount).toBeGreaterThan(0);
  });
});
