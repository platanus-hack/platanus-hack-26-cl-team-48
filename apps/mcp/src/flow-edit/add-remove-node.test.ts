import { coreNodes } from "@nodomics/nodes-core";
import { describe, expect, it } from "vitest";
import { applyOp, emptyFlow } from "./index.ts";
import {
  deepFreeze,
  edge,
  edgeEnds,
  errorOf,
  flowOf,
  node,
  nodeById,
  pipelineFlow,
  sourceManifest,
  transformManifest,
  testCatalog,
  unwrap,
} from "./test-fixtures.ts";

const addNode = (type: string, nodeId: string) =>
  ({ op: "add_node", args: { type, nodeId } }) as const;
const removeNode = (nodeId: string) => ({ op: "remove_node", args: { nodeId } }) as const;

describe("emptyFlow", () => {
  it("has the flow format and no nodes or connections", () => {
    const flow = emptyFlow();

    expect(flow.format).toBe("nodomics/flow@0");
    expect(flow.nodes).toEqual([]);
    expect(flow.edges).toEqual([]);
  });

  it("keeps the given name", () => {
    const flow = emptyFlow("Ventas");

    expect(flow.name).toBe("Ventas");
  });
});

describe("add_node", () => {
  it("appends a node with the type and the manifest version at the end", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, addNode("t.join", "j"), testCatalog));

    expect(result.nodes.map((n) => n.id)).toEqual(["src", "tr", "j"]);
    expect(result.nodes.at(-1)).toMatchObject({ id: "j", type: "t.join", version: "0.1.0" });
  });

  it("fills params with the schema defaults and leaves out params without default", () => {
    const flow = emptyFlow();

    const result = unwrap(applyOp(flow, addNode("t.transform", "tr"), testCatalog));

    expect(nodeById(result, "tr")?.params).toEqual({ n: 3, mode: "a" });
  });

  it("uses the defaults of a core node manifest", () => {
    const flow = emptyFlow();

    const result = unwrap(applyOp(flow, addNode("core.view.table", "tabla"), coreNodes));

    expect(nodeById(result, "tabla")?.params).toEqual({ rows: 20 });
  });

  it("places each new node at a numeric position not used by another node", () => {
    const flow = pipelineFlow();

    const result = ["a", "b", "c", "d"].reduce(
      (current, id) => unwrap(applyOp(current, addNode("t.source", id), testCatalog)),
      flow,
    );

    expect(result.nodes.slice(0, flow.nodes.length)).toEqual(flow.nodes);
    result.nodes.slice(flow.nodes.length).forEach((added, index) => {
      expect(Number.isFinite(added.position.x) && Number.isFinite(added.position.y)).toBe(true);
      expect(
        result.nodes.slice(0, flow.nodes.length + index).map((previous) => previous.position),
      ).not.toContainEqual(added.position);
    });
  });

  it("accepts a type declared in the flow's custom nodes", () => {
    const custom = { ...sourceManifest, id: "custom.thing" };
    const flow = flowOf([], [], [custom]);

    const result = unwrap(applyOp(flow, addNode("custom.thing", "c"), testCatalog));

    expect(nodeById(result, "c")?.type).toBe("custom.thing");
  });

  it("returns an error for a type that is not in the catalog", () => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, addNode("t.missing", "m"), testCatalog));

    expect(message).toContain("t.missing");
  });

  it("returns an error when the node id already exists", () => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, addNode("t.source", "src"), testCatalog));

    expect(message).toContain("src");
  });

  it.each(["", "has space", "ñandú", "a/b", "x".repeat(65)])(
    "returns an error for the invalid node id %j",
    (nodeId) => {
      const flow = emptyFlow();

      const result = applyOp(flow, addNode("t.source", nodeId), testCatalog);

      expect(result.ok).toBe(false);
    },
  );

  it("accepts a node id of 64 valid characters", () => {
    const flow = emptyFlow();

    const result = applyOp(flow, addNode("t.source", "a".repeat(64)), testCatalog);

    expect(result.ok).toBe(true);
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, addNode("t.source", "new"), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(pipelineFlow());
  });
});

describe("remove_node", () => {
  it("removes the node", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, removeNode("tr"), testCatalog));

    expect(result.nodes.map((n) => n.id)).toEqual(["src"]);
  });

  it("removes the incoming and outgoing connections of the node and keeps the rest", () => {
    const flow = flowOf(
      [
        node("a", "t.source"),
        node("b", "t.transform"),
        node("c", "t.transform"),
        node("d", "t.join"),
      ],
      [edge("a.out", "b.in"), edge("b.out", "c.in"), edge("a.out", "d.left")],
    );

    const result = unwrap(applyOp(flow, removeNode("b"), testCatalog));

    expect(edgeEnds(result)).toEqual(["a.out->d.left"]);
  });

  it("removes the custom manifest of a code node of the flow", () => {
    const code = { ...transformManifest, id: "code.py" };
    const flow = flowOf([node("py", "code.py")], [], [code]);

    const result = unwrap(applyOp(flow, removeNode("py"), testCatalog));

    expect(result.nodes).toEqual([]);
    expect(result.customNodes ?? []).toEqual([]);
  });

  it("returns an error for a node that does not exist", () => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, removeNode("ghost"), testCatalog));

    expect(message).toContain("ghost");
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, removeNode("tr"), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(pipelineFlow());
  });
});
