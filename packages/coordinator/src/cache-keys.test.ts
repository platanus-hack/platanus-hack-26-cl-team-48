import type { Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { computeCacheKeys } from "./cache-keys.ts";
import { toCatalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import { coreCatalog, edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";
import { topologicalOrder } from "./topological-order.ts";

const keysOf = (flow: Flow) => {
  const graph = expandSubflows(flow, toCatalog(coreCatalog));
  if (!graph.ok) throw new Error("fixture flow must expand");
  const order = topologicalOrder(graph.value);
  if (!order.ok) throw new Error("fixture flow must be acyclic");
  return computeCacheKeys(graph.value, order.value);
};

const chain = (filterParams: Record<string, unknown>) =>
  flowOf(
    [
      flowNode("s", "core.source", { sourceId: "src_1" }),
      flowNode("f", "core.filter", filterParams),
      flowNode("p", "core.python"),
    ],
    [edge("s", "f"), edge("f", "p")],
  );

describe("computeCacheKeys", () => {
  it("gives the same keys to the same flow", () => {
    expect(keysOf(chain({ column: "a", value: "1" }))).toEqual(
      keysOf(chain({ column: "a", value: "1" })),
    );
  });

  it("ignores the order in which params are written", () => {
    expect(keysOf(chain({ column: "a", value: "1" }))).toEqual(
      keysOf(chain({ value: "1", column: "a" })),
    );
  });

  it("ignores positions and labels", () => {
    const flow = chain({ column: "a", value: "1" });
    const moved = {
      ...flow,
      nodes: flow.nodes.map((node) => ({ ...node, position: { x: 99, y: 7 }, label: "otro" })),
    };

    expect(keysOf(moved)).toEqual(keysOf(flow));
  });

  it("changes the key of an edited node and of everything downstream, not upstream", () => {
    const before = keysOf(chain({ column: "a", value: "1" }));

    const after = keysOf(chain({ column: "a", value: "2" }));

    expect(after.get("s")).toBe(before.get("s"));
    expect(after.get("f")).not.toBe(before.get("f"));
    expect(after.get("p")).not.toBe(before.get("p"));
  });

  it("changes the key when the node version changes", () => {
    const flow = chain({ column: "a", value: "1" });
    const upgraded = {
      ...flow,
      nodes: flow.nodes.map((node) => (node.id === "s" ? { ...node, version: "0.2.0" } : node)),
    };

    expect(keysOf(upgraded).get("s")).not.toBe(keysOf(flow).get("s"));
  });

  it("distinguishes equal nodes that read different inputs", () => {
    const keys = keysOf(
      flowOf(
        [
          flowNode("s1", "core.source", { sourceId: "src_1" }),
          flowNode("s2", "core.source", { sourceId: "src_2" }),
          flowNode("p1", "core.python"),
          flowNode("p2", "core.python"),
        ],
        [edge("s1", "p1"), edge("s2", "p2")],
      ),
    );

    expect(keys.get("p1")).not.toBe(keys.get("p2"));
  });
});
