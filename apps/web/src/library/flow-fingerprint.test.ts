import type { Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { edgeOf, FILTER, flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { flowFingerprint } from "./flow-fingerprint.ts";

const FLOW: Flow = {
  ...flowOf(
    [nodeOf("s", SAMPLE.id), { ...nodeOf("f", FILTER.id), params: { op: ">", value: "10" } }],
    [edgeOf("s-f", ["s", "out"], ["f", "in"])],
  ),
  name: "Ventas",
};

/** The same flow written with every object's keys in reverse order. */
function withKeysReversed(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withKeysReversed);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, inner]) => [key, withKeysReversed(inner)]),
  );
}

const withFilterParams = (params: Flow["nodes"][number]["params"]): Flow => ({
  ...FLOW,
  nodes: FLOW.nodes.map((node) => (node.id === "f" ? { ...node, params } : node)),
});

describe("flowFingerprint", () => {
  it("is a non-empty string", () => {
    const fingerprint = flowFingerprint(FLOW);

    expect(fingerprint.length).toBeGreaterThan(0);
  });

  it("is the same for the same flow computed twice", () => {
    const first = flowFingerprint(FLOW);

    const second = flowFingerprint(structuredClone(FLOW));

    expect(second).toBe(first);
  });

  it("does not depend on the order of object keys", () => {
    const reordered = withKeysReversed(FLOW) as Flow;

    const fingerprint = flowFingerprint(reordered);

    expect(fingerprint).toBe(flowFingerprint(FLOW));
  });

  it("does not depend on the order of the keys inside a param value", () => {
    const original = withFilterParams({ op: ">", value: "10", extra: { a: 1, b: 2 } });
    const reordered = withFilterParams({ extra: { b: 2, a: 1 }, value: "10", op: ">" });

    expect(flowFingerprint(reordered)).toBe(flowFingerprint(original));
  });

  it("changes when a param changes", () => {
    const edited = withFilterParams({ op: ">", value: "20" });

    expect(flowFingerprint(edited)).not.toBe(flowFingerprint(FLOW));
  });

  it("changes when a node is added", () => {
    const edited: Flow = { ...FLOW, nodes: [...FLOW.nodes, nodeOf("g", FILTER.id)] };

    expect(flowFingerprint(edited)).not.toBe(flowFingerprint(FLOW));
  });

  it("changes when a node is removed", () => {
    const edited: Flow = { ...FLOW, nodes: FLOW.nodes.filter(({ id }) => id !== "f"), edges: [] };

    expect(flowFingerprint(edited)).not.toBe(flowFingerprint(FLOW));
  });

  it("changes when a connection changes", () => {
    const edited: Flow = { ...FLOW, edges: [] };

    expect(flowFingerprint(edited)).not.toBe(flowFingerprint(FLOW));
  });

  it("changes when the flow is renamed", () => {
    const edited: Flow = { ...FLOW, name: "Compras" };

    expect(flowFingerprint(edited)).not.toBe(flowFingerprint(FLOW));
  });
});
