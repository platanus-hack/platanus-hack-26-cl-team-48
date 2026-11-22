import type { Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { revisionOf } from "./index.ts";
import { edge, flowOf, node, pipelineFlow } from "./test-fixtures.ts";

const reorderedPipelineFlow = (): Flow => ({
  edges: [
    { to: { port: "in", node: "tr" }, from: { port: "out", node: "src" }, id: "src_out-tr_in" },
  ],
  nodes: [
    {
      position: { y: 0, x: 0 },
      params: { rows: 5 },
      version: "0.1.0",
      type: "t.source",
      id: "src",
    },
    {
      params: { name: "x", n: 3 },
      position: { y: 0, x: 0 },
      type: "t.transform",
      id: "tr",
      version: "0.1.0",
    },
  ],
  format: "nodomics/flow@0",
});

describe("revisionOf", () => {
  it("is 12 hexadecimal characters", () => {
    const revision = revisionOf(pipelineFlow());

    expect(revision).toMatch(/^[0-9a-f]{12}$/);
  });

  it("is the same for the same flow", () => {
    const [first, second] = [revisionOf(pipelineFlow()), revisionOf(pipelineFlow())];

    expect(first).toBe(second);
  });

  it("is the same for equal flows whose object keys are in a different order", () => {
    const flow = reorderedPipelineFlow();

    const revision = revisionOf(flow);

    expect(revision).toBe(revisionOf(pipelineFlow()));
  });

  it.each<[string, Flow]>([
    [
      "a param",
      flowOf(
        [node("src", "t.source", { rows: 6 }), node("tr", "t.transform", { n: 3, name: "x" })],
        [edge("src.out", "tr.in")],
      ),
    ],
    [
      "a position",
      {
        ...pipelineFlow(),
        nodes: pipelineFlow().nodes.map((n) =>
          n.id === "src" ? { ...n, position: { x: 1, y: 0 } } : n,
        ),
      },
    ],
    [
      "the connections",
      flowOf([
        node("src", "t.source", { rows: 5 }),
        node("tr", "t.transform", { n: 3, name: "x" }),
      ]),
    ],
    ["the name", { ...pipelineFlow(), name: "Otro" }],
  ])("changes when %s changes", (_, changed) => {
    const revision = revisionOf(changed);

    expect(revision).not.toBe(revisionOf(pipelineFlow()));
  });
});
