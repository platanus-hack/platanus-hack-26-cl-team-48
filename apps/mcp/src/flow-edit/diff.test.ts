import type { Flow, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { diffFlows, type ChangeKind } from "./index.ts";
import {
  deepFreeze,
  edge,
  flowOf,
  node,
  pipelineFlow,
  transformManifest,
} from "./test-fixtures.ts";

const codeManifest = (template: string): NodeManifest => ({
  ...transformManifest,
  id: "code.py",
  impl: { kind: "sql", template },
});

const withNodes = (flow: Flow, ...extra: Flow["nodes"]): Flow => ({
  ...flow,
  nodes: [...flow.nodes, ...extra],
});

const withParams = (flow: Flow, nodeId: string, params: Record<string, unknown>): Flow => ({
  ...flow,
  nodes: flow.nodes.map((n) => (n.id === nodeId ? { ...n, params } : n)),
});

const CHANGE_GROUP: Readonly<Record<ChangeKind, number>> = {
  add_node: 0,
  remove_node: 0,
  add_custom_node: 1,
  update_custom_node: 1,
  set_param: 2,
  connect: 3,
  disconnect: 3,
};

describe("diffFlows", () => {
  it("returns no changes for equal flows", () => {
    const [base, draft] = [pipelineFlow(), pipelineFlow()];

    const changes = diffFlows(base, draft);

    expect(changes).toEqual([]);
  });

  it("ignores position changes", () => {
    const draft = {
      ...pipelineFlow(),
      nodes: pipelineFlow().nodes.map((n) => ({ ...n, position: { x: 300, y: 120 } })),
    };

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes).toEqual([]);
  });

  it("reports an added node with the node as after", () => {
    const added = node("extra", "t.source");

    const changes = diffFlows(pipelineFlow(), withNodes(pipelineFlow(), added));

    expect(changes).toEqual([
      { id: "add_node:extra", kind: "add_node", target: "extra", after: added },
    ]);
  });

  it("reports a removed node with the node as before", () => {
    const base = withNodes(pipelineFlow(), node("extra", "t.source"));

    const changes = diffFlows(base, pipelineFlow());

    expect(changes).toEqual([
      {
        id: "remove_node:extra",
        kind: "remove_node",
        target: "extra",
        before: node("extra", "t.source"),
      },
    ]);
  });

  it("reports an added code node as a node and as a custom node", () => {
    const manifest = codeManifest("SELECT 1");
    const draft = { ...withNodes(pipelineFlow(), node("py", "code.py")), customNodes: [manifest] };

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes).toEqual([
      { id: "add_node:py", kind: "add_node", target: "py", after: node("py", "code.py") },
      { id: "add_custom_node:py", kind: "add_custom_node", target: "py", after: manifest },
    ]);
  });

  it("reports a changed code manifest as an updated custom node", () => {
    const withCode = withNodes(pipelineFlow(), node("py", "code.py"));
    const [before, after] = [codeManifest("SELECT 1"), codeManifest("SELECT 2")];

    const changes = diffFlows(
      { ...withCode, customNodes: [before] },
      { ...withCode, customNodes: [after] },
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      id: "update_custom_node:py",
      kind: "update_custom_node",
      target: "py",
      after,
    });
  });

  it("reports a changed param with its before and after values", () => {
    const draft = withParams(pipelineFlow(), "tr", { n: 7, name: "x" });

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes).toEqual([
      { id: "set_param:tr.n", kind: "set_param", target: "tr.n", before: 3, after: 7 },
    ]);
  });

  it("reports a new param without a before value", () => {
    const draft = withParams(pipelineFlow(), "tr", { n: 3, name: "x", flag: true });

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ id: "set_param:tr.flag", kind: "set_param", after: true });
    expect(changes[0]?.before).toBeUndefined();
  });

  it("reports a param whose array value changes", () => {
    const base = withParams(pipelineFlow(), "tr", { n: 3, name: "x", tags: ["a"] });
    const draft = withParams(pipelineFlow(), "tr", { n: 3, name: "x", tags: ["a", "b"] });

    const changes = diffFlows(base, draft);

    expect(changes.map((c) => c.id)).toEqual(["set_param:tr.tags"]);
  });

  it("does not report params of added nodes as param changes", () => {
    const draft = withNodes(pipelineFlow(), node("extra", "t.transform", { n: 1, name: "y" }));

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes.map((c) => c.kind)).toEqual(["add_node"]);
  });

  it("reports an added connection by its ends", () => {
    const base = flowOf([node("a", "t.source"), node("b", "t.transform")]);
    const draft = flowOf(
      [node("a", "t.source"), node("b", "t.transform")],
      [edge("a.out", "b.in")],
    );

    const changes = diffFlows(base, draft);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      id: "connect:a.out->b.in",
      kind: "connect",
      target: "a.out->b.in",
    });
  });

  it("reports a removed connection by its ends", () => {
    const base = flowOf([node("a", "t.source"), node("b", "t.transform")], [edge("a.out", "b.in")]);
    const draft = flowOf([node("a", "t.source"), node("b", "t.transform")]);

    const changes = diffFlows(base, draft);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      id: "disconnect:a.out->b.in",
      kind: "disconnect",
      target: "a.out->b.in",
    });
  });

  it("does not report a connection whose id changed but whose ends did not", () => {
    const draft = {
      ...pipelineFlow(),
      edges: pipelineFlow().edges.map((e) => ({ ...e, id: "another-id" })),
    };

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes).toEqual([]);
  });

  it("orders changes as nodes, code, params and connections", () => {
    const draft: Flow = {
      ...flowOf(
        [
          node("src", "t.source", { rows: 5 }),
          node("tr", "t.transform", { n: 9, name: "x" }),
          node("py", "code.py"),
        ],
        [edge("tr.out", "py.in")],
      ),
      customNodes: [codeManifest("SELECT 1")],
    };

    const changes = diffFlows(pipelineFlow(), draft);

    const groups = changes.map((c) => CHANGE_GROUP[c.kind]);
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
    expect(new Set(groups)).toEqual(new Set([0, 1, 2, 3]));
  });

  it("builds every change id from its kind and target", () => {
    const draft = withParams(withNodes(pipelineFlow(), node("extra", "t.source")), "tr", {
      n: 1,
      name: "x",
    });

    const changes = diffFlows(pipelineFlow(), draft);

    expect(changes.every((c) => c.id === `${c.kind}:${c.target}`)).toBe(true);
  });

  it("does not mutate its arguments", () => {
    const base = deepFreeze(pipelineFlow());
    const draft = deepFreeze(withParams(pipelineFlow(), "tr", { n: 7, name: "x" }));

    diffFlows(base, draft);

    expect(base).toEqual(pipelineFlow());
  });
});
