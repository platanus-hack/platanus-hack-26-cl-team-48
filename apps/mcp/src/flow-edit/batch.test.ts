import { describe, expect, it } from "vitest";
import { applyBatch, emptyFlow, type EditOp } from "./index.ts";
import {
  deepFreeze,
  edgeEnds,
  errorOf,
  pipelineFlow,
  testCatalog,
  unwrap,
} from "./test-fixtures.ts";

const buildOps: readonly EditOp[] = [
  { op: "add_node", args: { type: "t.source", nodeId: "a" } },
  { op: "add_node", args: { type: "t.transform", nodeId: "b" } },
  { op: "connect", args: { from: "a.out", to: "b.in" } },
  { op: "set_param", args: { nodeId: "b", name: "name", value: "total" } },
];

describe("applyBatch", () => {
  it("applies every op in order, each on the result of the previous one", () => {
    const flow = emptyFlow();

    const result = unwrap(applyBatch(flow, buildOps, testCatalog));

    expect(result.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(edgeEnds(result)).toEqual(["a.out->b.in"]);
    expect(result.nodes[1]?.params).toMatchObject({ name: "total" });
  });

  it("returns the same flow for an empty list of ops", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyBatch(flow, [], testCatalog));

    expect(result).toEqual(pipelineFlow());
  });

  it("prefixes the error with the index of the failing op", () => {
    const ops: readonly EditOp[] = [
      { op: "add_node", args: { type: "t.source", nodeId: "a" } },
      { op: "remove_node", args: { nodeId: "ghost" } },
    ];

    const message = errorOf(applyBatch(emptyFlow(), ops, testCatalog));

    expect(message.startsWith("ops[1]: ")).toBe(true);
  });

  it("applies none of the ops when one fails", () => {
    const flow = deepFreeze(pipelineFlow());
    const ops: readonly EditOp[] = [
      { op: "add_node", args: { type: "t.source", nodeId: "a" } },
      { op: "connect", args: { from: "a.out", to: "ghost.in" } },
    ];

    const result = applyBatch(flow, ops, testCatalog);

    expect(result.ok).toBe(false);
    expect(flow).toEqual(pipelineFlow());
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(emptyFlow());

    const result = applyBatch(flow, buildOps, testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(emptyFlow());
  });
});
