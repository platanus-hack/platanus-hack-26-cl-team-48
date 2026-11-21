import { describe, expect, it } from "vitest";
import {
  applySelectChanges,
  interpretDeletion,
  interpretNodeChanges,
  toConnection,
} from "./canvas-changes.ts";

const NONE = { dragging: new Map(), measured: new Map(), selectedIds: [] };

describe("interpretNodeChanges", () => {
  it("remembers the size the canvas measured, which it needs to show the node", () => {
    const outcome = interpretNodeChanges(
      [{ type: "dimensions", id: "a", dimensions: { width: 180, height: 70 } }],
      NONE,
    );

    expect([...outcome.measured]).toEqual([["a", { width: 180, height: 70 }]]);
  });

  it("forgets the size of removed nodes", () => {
    const outcome = interpretNodeChanges([{ type: "remove", id: "a" }], {
      ...NONE,
      measured: new Map([["a", { width: 180, height: 70 }]]),
    });

    expect([...outcome.measured]).toEqual([]);
  });

  it("follows a drag without changing the flow", () => {
    const outcome = interpretNodeChanges(
      [{ type: "position", id: "a", position: { x: 5, y: 6 }, dragging: true }],
      NONE,
    );

    expect(outcome.commands).toEqual([]);
    expect([...outcome.dragging]).toEqual([["a", { x: 5, y: 6 }]]);
  });

  it("moves the node when the drag ends", () => {
    const outcome = interpretNodeChanges([{ type: "position", id: "a", dragging: false }], {
      ...NONE,
      dragging: new Map([["a", { x: 5, y: 6 }]]),
    });

    expect(outcome.commands).toEqual([
      { type: "node.move", nodeId: "a", position: { x: 5, y: 6 } },
    ]);
    expect(outcome.dragging.size).toBe(0);
  });

  it("leaves removals to the deletion handler", () => {
    expect(interpretNodeChanges([{ type: "remove", id: "a" }], NONE).commands).toEqual([]);
  });

  it("updates the selection and forgets removed nodes", () => {
    const outcome = interpretNodeChanges(
      [
        { type: "select", id: "a", selected: false },
        { type: "select", id: "c", selected: true },
        { type: "remove", id: "b" },
      ],
      { ...NONE, selectedIds: ["a", "b"] },
    );

    expect(outcome.selectedIds).toEqual(["c"]);
  });
});

describe("applySelectChanges", () => {
  it("adds and removes selected ids", () => {
    expect(
      applySelectChanges(
        [
          { type: "select", id: "e1", selected: true },
          { type: "select", id: "e2", selected: false },
        ],
        ["e2"],
      ),
    ).toEqual(["e1"]);
  });
});

describe("interpretDeletion", () => {
  it("deletes nodes and connections as one undoable step", () => {
    expect(interpretDeletion({ nodes: [{ id: "a" }], edges: [{ id: "e1" }] })).toEqual({
      type: "batch",
      edits: [
        { type: "node.remove", nodeIds: ["a"] },
        { type: "edge.remove", edgeId: "e1" },
      ],
    });
  });

  it("does nothing when nothing was deleted", () => {
    expect(interpretDeletion({ nodes: [], edges: [] })).toBeUndefined();
  });
});

describe("toConnection", () => {
  it("translates a canvas connection between port handles", () => {
    expect(
      toConnection({ source: "a", sourceHandle: "out", target: "b", targetHandle: "in" }),
    ).toEqual({ from: { node: "a", port: "out" }, to: { node: "b", port: "in" } });
  });

  it("ignores connections that do not start or end on a port", () => {
    expect(
      toConnection({ source: "a", sourceHandle: null, target: "b", targetHandle: "in" }),
    ).toBeUndefined();
  });
});
