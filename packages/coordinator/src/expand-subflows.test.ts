import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { toCatalog } from "./catalog.ts";
import { expandSubflows } from "./expand-subflows.ts";
import {
  coreCatalog,
  edge,
  flowNode,
  flowOf,
  doubleFilterManifest,
} from "./testing/catalog-fixtures.ts";

const catalog = toCatalog(coreCatalog);

const wiring = (edges: ReadonlyArray<{ from: { node: string }; to: { node: string } }>) =>
  edges.map(({ from, to }) => `${from.node}->${to.node}`);

describe("expandSubflows", () => {
  it("keeps a flow without composite nodes as is, attaching each manifest", () => {
    const flow = flowOf(
      [flowNode("s", "core.source", { sourceId: "src_1" }), flowNode("f", "core.filter")],
      [edge("s", "f")],
    );

    const result = expandSubflows(flow, catalog);

    expect(result).toMatchObject({
      ok: true,
      value: {
        nodes: [
          { id: "s", origin: "s", manifest: { id: "core.source" } },
          { id: "f", origin: "f", manifest: { id: "core.filter" } },
        ],
        edges: flow.edges,
      },
    });
  });

  it("replaces a composite node with its inner nodes under prefixed ids", () => {
    const flow = flowOf(
      [
        flowNode("s", "core.source"),
        flowNode("d", "core.double-filter"),
        flowNode("p", "core.python"),
      ],
      [edge("s", "d"), edge("d", "p")],
    );

    const result = expandSubflows(flow, catalog);

    expect(result.ok && result.value.nodes.map((node) => [node.id, node.origin])).toEqual([
      ["s", "s"],
      ["d.a", "d"],
      ["d.b", "d"],
      ["p", "p"],
    ]);
  });

  it("reconnects the composite's ports through its flow.input and flow.output nodes", () => {
    const flow = flowOf(
      [
        flowNode("s", "core.source"),
        flowNode("d", "core.double-filter"),
        flowNode("p", "core.python"),
      ],
      [edge("s", "d"), edge("d", "p")],
    );

    const result = expandSubflows(flow, catalog);

    expect(result.ok && wiring(result.value.edges)).toEqual(["d.a->d.b", "s->d.a", "d.b->p"]);
  });

  it("expands composite nodes nested inside other composite nodes", () => {
    const nested: NodeManifest = {
      ...doubleFilterManifest,
      id: "core.nested",
      impl: {
        kind: "flow",
        graph: {
          nodes: [
            flowNode("i", "flow.input", { name: "in" }),
            flowNode("d", "core.double-filter"),
            flowNode("o", "flow.output", { name: "out" }),
          ],
          edges: [edge("i", "d"), edge("d", "o")],
        },
      },
    };
    const flow = flowOf(
      [flowNode("s", "core.source"), flowNode("n", "core.nested")],
      [edge("s", "n")],
    );

    const result = expandSubflows(flow, toCatalog([...coreCatalog, nested]));

    expect(result.ok && wiring(result.value.edges)).toEqual(["n.d.a->n.d.b", "s->n.d.a"]);
  });

  it("reports nodes whose type is not in the catalog", () => {
    const flow = flowOf([flowNode("x", "core.unknown")], []);

    const result = expandSubflows(flow, catalog);

    expect(result).toMatchObject({
      ok: false,
      error: [{ nodeId: "x", code: "UNKNOWN_NODE_TYPE" }],
    });
  });
});

it.each(["core.recursive", "core.indirect"])(
  "rejects recursive composite references through %s",
  (type) => {
    const recursive: NodeManifest = {
      ...doubleFilterManifest,
      id: "core.recursive",
      impl: { kind: "flow", graph: { nodes: [flowNode("self", type)], edges: [] } },
    };
    const indirect: NodeManifest = {
      ...doubleFilterManifest,
      id: "core.indirect",
      impl: { kind: "flow", graph: { nodes: [flowNode("back", "core.recursive")], edges: [] } },
    };
    expect(
      expandSubflows(
        flowOf([flowNode("r", "core.recursive")], []),
        toCatalog([...coreCatalog, recursive, indirect]),
      ),
    ).toMatchObject({
      ok: false,
      error: [expect.objectContaining({ code: "CYCLE" })],
    });
  },
);

it("reports an unknown builtin as a domain error", () => {
  const manifest: NodeManifest = {
    ...doubleFilterManifest,
    id: "test.unknown-builtin",
    impl: { kind: "builtin", name: "flow.input" },
  };

  // Exercise an invalid catalog entry despite the protocol’s closed builtin names.
  Object.defineProperty(manifest.impl, "name", { value: "flow.unknown" });

  expect(
    expandSubflows(flowOf([flowNode("x", manifest.id)], []), toCatalog([manifest])),
  ).toMatchObject({ ok: false, error: [{ nodeId: "x", code: "UNKNOWN_NODE_TYPE" }] });
});
