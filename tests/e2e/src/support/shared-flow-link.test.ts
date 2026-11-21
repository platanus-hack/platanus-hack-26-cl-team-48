import lzString from "lz-string";
import { describe, expect, it } from "vitest";
import { toSharedFlowPath } from "./shared-flow-link.ts";

describe("toSharedFlowPath", () => {
  it("encodes the flow in the fragment the app reads on open", () => {
    const flow = { format: "nodomics/flow@0", nodes: [], edges: [] };

    const path = toSharedFlowPath(flow);

    expect(path.startsWith("/#flow=")).toBe(true);
    expect(
      JSON.parse(lzString.decompressFromEncodedURIComponent(path.slice("/#flow=".length))),
    ).toEqual(flow);
  });
});
