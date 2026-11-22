import type { DataType } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { applyOp, validateFlow } from "./index.ts";
import { edge, edgeEnds, flowOf, manifest, node, unwrap } from "./test-fixtures.ts";

function portCatalog(outputType: DataType, inputType: DataType, multi = false) {
  return [
    manifest({ id: "t.source", outputs: [{ id: "out", type: outputType }] }),
    manifest({ id: "t.sink", inputs: [{ id: "in", type: inputType, multi }] }),
  ];
}

const nodes = () => [node("a", "t.source"), node("b", "t.source"), node("sink", "t.sink")];
const connect = (from: string) => ({ op: "connect", args: { from, to: "sink.in" } }) as const;

describe("port connection contract", () => {
  it("rejects connecting a chart output to a table input", () => {
    const flow = flowOf(nodes());

    const result = applyOp(flow, connect("a.out"), portCatalog("chart", "table"));

    expect(result.ok).toBe(false);
    expect(flow.edges).toEqual([]);
  });

  it.each<[DataType, DataType]>([
    ["any", "table"],
    ["chart", "any"],
  ])("accepts %s to %s when either port accepts any data", (outputType, inputType) => {
    const flow = flowOf(nodes());

    const result = unwrap(applyOp(flow, connect("a.out"), portCatalog(outputType, inputType)));

    expect(edgeEnds(result)).toEqual(["a.out->sink.in"]);
  });

  it("replaces the previous connection to an input that is not multi", () => {
    const flow = flowOf(nodes(), [edge("a.out", "sink.in")]);

    const result = unwrap(applyOp(flow, connect("b.out"), portCatalog("table", "table")));

    expect(edgeEnds(result)).toEqual(["b.out->sink.in"]);
    expect(edgeEnds(flow)).toEqual(["a.out->sink.in"]);
  });

  it("preserves both connections to a multi input", () => {
    const flow = flowOf(nodes(), [edge("a.out", "sink.in")]);

    const result = unwrap(applyOp(flow, connect("b.out"), portCatalog("table", "table", true)));

    expect(edgeEnds(result)).toEqual(["a.out->sink.in", "b.out->sink.in"]);
  });

  it("reports incompatible port types in an externally loaded flow", () => {
    const flow = flowOf(nodes(), [edge("a.out", "sink.in")]);

    const report = validateFlow(flow, portCatalog("chart", "table"));

    expect(report.valid).toBe(false);
    expect(report.issues.some(({ nodeId }) => nodeId === "sink")).toBe(true);
  });

  it("reports multiple connections to an input that is not multi", () => {
    const flow = flowOf(nodes(), [edge("a.out", "sink.in"), edge("b.out", "sink.in")]);

    const report = validateFlow(flow, portCatalog("table", "table"));

    expect(report.valid).toBe(false);
    expect(report.issues.some(({ nodeId }) => nodeId === "sink")).toBe(true);
  });

  it("accepts multiple compatible connections to a multi input", () => {
    const flow = flowOf(nodes(), [edge("a.out", "sink.in"), edge("b.out", "sink.in")]);

    const report = validateFlow(flow, portCatalog("table", "table", true));

    expect(report).toEqual({ valid: true, issues: [] });
  });
});
