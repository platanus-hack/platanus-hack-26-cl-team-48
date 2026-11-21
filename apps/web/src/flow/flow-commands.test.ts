import { FLOW_FORMAT, type FlowEdge, type FlowNode, type NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { applyCommand, createFlowState, type Command, type FlowState } from "./flow-commands.ts";

const node = (id: string, x = 0): FlowNode => ({
  id,
  type: "core.filter",
  version: "0.1.0",
  params: {},
  position: { x, y: 0 },
});

const edge = (id: string, from: string, to: string): FlowEdge => ({
  id,
  from: { node: from, port: "out" },
  to: { node: to, port: "in" },
});

const customManifest: NodeManifest = {
  id: "custom.clean",
  version: "0.1.0",
  name: "Limpiar",
  category: "Mis nodos",
  inputs: [],
  outputs: [],
  params: { type: "object", properties: {} },
  impl: { kind: "flow", graph: { nodes: [], edges: [] } },
};

const applyAll = (state: FlowState, commands: ReadonlyArray<Command>): FlowState =>
  commands.reduce(applyCommand, state);

const twoConnectedNodes = (): FlowState =>
  applyAll(createFlowState(), [
    { type: "node.add", node: node("a") },
    { type: "node.add", node: node("b", 100) },
    { type: "edge.add", edge: edge("e1", "a", "b") },
  ]);

describe("applyCommand", () => {
  it("starts from an empty flow at revision zero", () => {
    const state = createFlowState();

    expect(state.flow).toEqual({ format: FLOW_FORMAT, nodes: [], edges: [] });
    expect(state.rev).toBe(0);
  });

  it("adds a node and increments the revision", () => {
    const state = applyCommand(createFlowState(), { type: "node.add", node: node("a") });

    expect(state.flow.nodes).toEqual([node("a")]);
    expect(state.rev).toBe(1);
  });

  it("moves a node to a new position", () => {
    const state = applyCommand(twoConnectedNodes(), {
      type: "node.move",
      nodeId: "a",
      position: { x: 40, y: 50 },
    });

    expect(state.flow.nodes[0]?.position).toEqual({ x: 40, y: 50 });
  });

  it("removes nodes together with the edges that touch them", () => {
    const state = applyCommand(twoConnectedNodes(), { type: "node.remove", nodeIds: ["a"] });

    expect(state.flow.nodes.map((n) => n.id)).toEqual(["b"]);
    expect(state.flow.edges).toEqual([]);
  });

  it("connects and disconnects ports", () => {
    const connected = twoConnectedNodes();

    const disconnected = applyCommand(connected, { type: "edge.remove", edgeId: "e1" });

    expect(connected.flow.edges).toEqual([edge("e1", "a", "b")]);
    expect(disconnected.flow.edges).toEqual([]);
  });

  it("sets a parameter and removes it when the value is undefined", () => {
    const set = applyCommand(twoConnectedNodes(), {
      type: "param.set",
      nodeId: "a",
      param: "column",
      value: "region",
    });

    const unset = applyCommand(set, {
      type: "param.set",
      nodeId: "a",
      param: "column",
      value: undefined,
    });

    expect(set.flow.nodes[0]?.params).toEqual({ column: "region" });
    expect(unset.flow.nodes[0]?.params).toEqual({});
  });

  it("adds a custom node manifest to the flow", () => {
    const state = applyCommand(createFlowState(), {
      type: "customNode.add",
      manifest: customManifest,
    });

    expect(state.flow.customNodes).toEqual([customManifest]);
  });

  it("applies a batch of edits as a single undoable step", () => {
    const batched = applyCommand(createFlowState(), {
      type: "batch",
      edits: [
        { type: "node.add", node: node("a") },
        { type: "node.add", node: node("b") },
      ],
    });

    const undone = applyCommand(batched, { type: "history.undo" });

    expect(batched.flow.nodes).toHaveLength(2);
    expect(undone.flow.nodes).toEqual([]);
  });

  it("undoes a node removal restoring the node and its edges", () => {
    const before = twoConnectedNodes();
    const removed = applyCommand(before, { type: "node.remove", nodeIds: ["a"] });

    const undone = applyCommand(removed, { type: "history.undo" });

    expect(undone.flow.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(undone.flow.edges).toEqual(before.flow.edges);
  });

  it("undoes a move back to the previous position", () => {
    const moved = applyCommand(twoConnectedNodes(), {
      type: "node.move",
      nodeId: "b",
      position: { x: 7, y: 8 },
    });

    const undone = applyCommand(moved, { type: "history.undo" });

    expect(undone.flow.nodes[1]?.position).toEqual({ x: 100, y: 0 });
  });

  it("undoes a parameter change back to the previous value", () => {
    const first = applyCommand(twoConnectedNodes(), {
      type: "param.set",
      nodeId: "a",
      param: "value",
      value: "Sur",
    });
    const second = applyCommand(first, {
      type: "param.set",
      nodeId: "a",
      param: "value",
      value: "Norte",
    });

    expect(applyCommand(second, { type: "history.undo" }).flow.nodes[0]?.params).toEqual({
      value: "Sur",
    });
  });

  it("redoes an undone edit", () => {
    const undone = applyAll(createFlowState(), [
      { type: "node.add", node: node("a") },
      { type: "history.undo" },
    ]);

    const redone = applyCommand(undone, { type: "history.redo" });

    expect(redone.flow.nodes).toEqual([node("a")]);
  });

  it("forgets redo history after a new edit", () => {
    const state = applyAll(createFlowState(), [
      { type: "node.add", node: node("a") },
      { type: "history.undo" },
      { type: "node.add", node: node("b") },
      { type: "history.redo" },
    ]);

    expect(state.flow.nodes).toEqual([node("b")]);
  });

  it("keeps the same state when there is nothing to undo or redo", () => {
    const state = createFlowState();

    expect(applyCommand(state, { type: "history.undo" })).toBe(state);
    expect(applyCommand(state, { type: "history.redo" })).toBe(state);
  });

  it("increments the revision on undo and redo because the flow changes", () => {
    const state = applyAll(createFlowState(), [
      { type: "node.add", node: node("a") },
      { type: "history.undo" },
      { type: "history.redo" },
    ]);

    expect(state.rev).toBe(3);
  });

  it("loads a whole flow, clearing the history", () => {
    const loaded = applyCommand(twoConnectedNodes(), {
      type: "flow.load",
      flow: { format: FLOW_FORMAT, name: "Ventas", nodes: [node("z")], edges: [] },
    });

    expect(loaded.flow.name).toBe("Ventas");
    expect(loaded.rev).toBe(4);
    expect(applyCommand(loaded, { type: "history.undo" })).toBe(loaded);
  });

  it("does not mutate the previous state", () => {
    const before = twoConnectedNodes();
    const snapshot = structuredClone(before.flow);

    applyCommand(before, { type: "node.remove", nodeIds: ["a", "b"] });

    expect(before.flow).toEqual(snapshot);
  });
});
