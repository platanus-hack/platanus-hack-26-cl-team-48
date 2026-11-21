import { expect, it } from "vitest";
import { manifestOf, nodeOf, edgeOf, flowOf } from "../canvas/canvas-fixtures.ts";
import { applyCommand, createFlowState } from "./flow-commands.ts";
import { nodeParamEdit } from "./node-param-edit.ts";
import { personalManifestEdits, updatePersonalNode } from "../library/personal-node-edits.ts";

const entry = manifestOf("flow.node", {
  params: {
    type: "object",
    properties: { inputs: { type: "array", "x-nodomics": { widget: "ports" } } },
  },
});
it("removes connections to renamed ports in one undoable command", () => {
  const node = {
    ...nodeOf("entry", entry.id),
    params: { inputs: [{ name: "Ventas", type: "table" }] },
  };
  const flow = flowOf(
    [node, nodeOf("out", "sink")],
    [edgeOf("edge", ["entry", "ventas"], ["out", "in"])],
  );
  const changed = applyCommand(
    createFlowState(flow),
    nodeParamEdit({
      flow,
      node,
      manifest: entry,
      param: "inputs",
      value: [{ name: "Compras", type: "table" }],
    }),
  );
  expect(changed.flow.edges).toEqual([]);
  expect(applyCommand(changed, { type: "history.undo" }).flow).toEqual(flow);
});
const child = manifestOf("mine.child");
const parent = manifestOf("mine.parent", {
  impl: { kind: "flow", graph: { nodes: [nodeOf("child", child.id)], edges: [] } },
});
it("copies personal dependencies transitively without duplicating manifests", () => {
  expect(
    personalManifestEdits({ flow: flowOf([]), manifest: parent, personalNodes: [parent, child] }),
  ).toEqual([
    { type: "customNode.add", manifest: parent },
    { type: "customNode.add", manifest: child },
  ]);
});
it("updates a personal manifest, dependencies and every instance with one inverse", () => {
  const flow = {
    ...flowOf([nodeOf("one", parent.id), nodeOf("two", parent.id)]),
    customNodes: [parent],
  };
  const newer = { ...parent, version: "0.1.1" };
  const changed = applyCommand(
    createFlowState(flow),
    updatePersonalNode({ flow, manifest: newer, personalNodes: [newer, child] }),
  );
  expect(changed.flow.nodes.map(({ version }) => version)).toEqual(["0.1.1", "0.1.1"]);
  expect(changed.flow.customNodes).toEqual([newer, child]);
  expect(applyCommand(changed, { type: "history.undo" }).flow).toEqual(flow);
});

it("restores the original order of copied manifests when undoing an update", () => {
  const flow = { ...flowOf([nodeOf("one", parent.id)]), customNodes: [parent, child] };
  const changed = applyCommand(
    createFlowState(flow),
    updatePersonalNode({
      flow,
      manifest: { ...parent, version: "0.1.1" },
      personalNodes: [parent, child],
    }),
  );
  expect(applyCommand(changed, { type: "history.undo" }).flow).toEqual(flow);
});
