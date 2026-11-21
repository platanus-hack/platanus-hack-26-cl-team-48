import { describe, expect, it } from "vitest";
import { flowLayoutKey, hasMovedFrom, initialViewport, visibleArea } from "./initial-viewport.ts";

describe("initial viewport", () => {
  it("fits the entire flow with margin below 85 percent", () => {
    const viewport = initialViewport(
      { x: 100, y: 50, width: 1000, height: 400 },
      { width: 760, height: 480 },
    );

    expect(viewport.zoom).toBeLessThan(0.85);
    expect(viewport.x + 100 * viewport.zoom).toBeGreaterThan(0);
    expect(viewport.x + 1100 * viewport.zoom).toBeLessThan(760);
    expect(viewport.y + 50 * viewport.zoom).toBeGreaterThan(0);
    expect(viewport.y + 450 * viewport.zoom).toBeLessThan(480);
  });

  it("centers oversized flows at the readability minimum", () => {
    const viewport = initialViewport(
      { x: -100, y: -50, width: 3000, height: 2000 },
      { width: 760, height: 480 },
    );

    expect(viewport.zoom).toBe(0.5);
    expect(viewport.x + 1400 * viewport.zoom).toBe(380);
    expect(viewport.y + 950 * viewport.zoom).toBe(240);
  });

  it("does not enlarge small flows above natural size", () => {
    expect(
      initialViewport({ x: 0, y: 0, width: 200, height: 100 }, { width: 760, height: 480 }).zoom,
    ).toBe(1);
  });
});

describe("fitting the flow between floating panels", () => {
  it("centers the flow in the part of the canvas the panels leave visible", () => {
    const viewport = initialViewport(
      { x: 0, y: 0, width: 200, height: 100 },
      { width: 1000, height: 600 },
      { x: 300, y: 100, width: 400, height: 300 },
    );

    expect(viewport.zoom).toBe(1);
    expect(viewport.x + 100).toBe(500);
    expect(viewport.y + 50).toBe(250);
  });

  it("measures the visible part from the panels on each side of the canvas", () => {
    expect(
      visibleArea(new DOMRect(0, 0, 1000, 600), {
        top: new DOMRect(12, 12, 976, 48),
        left: new DOMRect(12, 72, 280, 516),
        right: new DOMRect(708, 72, 280, 516),
        bottom: new DOMRect(304, 400, 392, 188),
      }),
    ).toEqual({ x: 292, y: 60, width: 416, height: 340 });
  });

  it("uses the whole canvas on sides without a panel", () => {
    expect(visibleArea(new DOMRect(0, 0, 1000, 600), {})).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 600,
    });
  });
});

describe("following the flow until the user moves the view", () => {
  it("tells a viewport the user moved from the one the canvas fitted", () => {
    const fitted = { x: 10, y: 20, zoom: 0.8 };

    expect(hasMovedFrom(fitted, [10, 20, 0.8])).toBe(false);
    expect(hasMovedFrom(fitted, [10.0001, 20, 0.8])).toBe(false);
    expect(hasMovedFrom(fitted, [60, 20, 0.8])).toBe(true);
    expect(hasMovedFrom(fitted, [10, 20, 1])).toBe(true);
  });

  it("changes the flow layout key only when a node moves or changes size", () => {
    const node = { position: { x: 0, y: 0 }, measured: { width: 200, height: 80 } };
    const key = flowLayoutKey([node, { position: { x: 300, y: 0 }, measured: {} }]);

    expect(flowLayoutKey([node, { position: { x: 300, y: 0 }, measured: {} }])).toBe(key);
    expect(flowLayoutKey([{ ...node, measured: { width: 360, height: 300 } }])).not.toBe(key);
  });
});
