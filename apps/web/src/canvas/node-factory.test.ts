import { describe, expect, it } from "vitest";
import { FILTER, SAMPLE } from "./canvas-fixtures.ts";
import { createFlowNode } from "./node-factory.ts";

describe("createFlowNode", () => {
  it("creates a node of the manifest's type and version at the given position", () => {
    const node = createFlowNode({
      manifest: FILTER,
      position: { x: 3, y: 4 },
      takenIds: new Set(),
    });

    expect(node).toMatchObject({ type: "core.filter", version: "0.1.0", position: { x: 3, y: 4 } });
  });

  it("fills the parameters that declare a default", () => {
    const node = createFlowNode({
      manifest: FILTER,
      position: { x: 0, y: 0 },
      takenIds: new Set(),
    });

    expect(node.params).toEqual({ op: "=" });
  });

  it("names the node after the last part of its type, avoiding taken ids", () => {
    const node = createFlowNode({
      manifest: SAMPLE,
      position: { x: 0, y: 0 },
      takenIds: new Set(["sample"]),
    });

    expect(node.id).toBe("sample-2");
  });
});
