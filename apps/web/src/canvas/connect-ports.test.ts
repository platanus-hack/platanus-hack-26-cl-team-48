import { describe, expect, it } from "vitest";
import { BAR, CATALOG, edgeOf, flowOf, nodeOf } from "./canvas-fixtures.ts";
import { connectPorts } from "./connect-ports.ts";

const FLOW = flowOf([
  nodeOf("src", "core.source.sample"),
  nodeOf("f", "core.filter"),
  nodeOf("g", "core.filter"),
  nodeOf("bar", "core.view.bar"),
  nodeOf("in", "flow.input"),
]);

describe("connectPorts", () => {
  it("connects an output to a compatible input", () => {
    const edit = connectPorts(FLOW, CATALOG, {
      from: { node: "src", port: "out" },
      to: { node: "f", port: "in" },
    });

    expect(edit).toEqual({
      type: "batch",
      edits: [
        {
          type: "edge.add",
          edge: { id: "edge", from: { node: "src", port: "out" }, to: { node: "f", port: "in" } },
        },
      ],
    });
  });

  it("replaces the connection of an input that accepts only one", () => {
    const connected = { ...FLOW, edges: [edgeOf("e1", ["src", "out"], ["f", "in"])] };

    const edit = connectPorts(connected, CATALOG, {
      from: { node: "g", port: "out" },
      to: { node: "f", port: "in" },
    });

    expect(edit?.type === "batch" && edit.edits.map((e) => e.type)).toEqual([
      "edge.remove",
      "edge.add",
    ]);
  });

  it("refuses ports of different data types", () => {
    const withChart = { ...FLOW, nodes: [...FLOW.nodes, { ...nodeOf("bar2", BAR.id) }] };

    expect(
      connectPorts(withChart, CATALOG, {
        from: { node: "bar", port: "out" },
        to: { node: "f", port: "in" },
      }),
    ).toBeUndefined();
  });

  it("accepts any data type on a port of type any", () => {
    expect(
      connectPorts(FLOW, CATALOG, {
        from: { node: "in", port: "out" },
        to: { node: "f", port: "in" },
      }),
    ).toBeDefined();
  });

  it("refuses to connect a node to itself", () => {
    expect(
      connectPorts(FLOW, CATALOG, {
        from: { node: "f", port: "out" },
        to: { node: "f", port: "in" },
      }),
    ).toBeUndefined();
  });

  it("refuses ports that do not exist", () => {
    expect(
      connectPorts(FLOW, CATALOG, {
        from: { node: "src", port: "nope" },
        to: { node: "f", port: "in" },
      }),
    ).toBeUndefined();
  });
});
