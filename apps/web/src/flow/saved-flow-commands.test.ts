import { expect, it } from "vitest";
import { FLOW_FORMAT } from "@nodomics/protocol";
import { applyCommand, createFlowState } from "./flow-commands.ts";

it("renames a flow with undo and redo", () => {
  const initial = createFlowState();
  const renamed = applyCommand(initial, { type: "flow.rename", name: "Ventas" });
  expect(renamed.flow.name).toBe("Ventas");
  const undone = applyCommand(renamed, { type: "history.undo" });
  expect(undone.flow).toEqual(initial.flow);
  expect(applyCommand(undone, { type: "history.redo" }).flow.name).toBe("Ventas");
});

it("rebinds sources without history and keeps history safe across undo", () => {
  const initial = createFlowState({
    format: FLOW_FORMAT,
    nodes: [
      {
        version: "0.1.0",
        id: "csv",
        type: "source.csv",
        params: { source: "old", value: "old" },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  });
  const edited = applyCommand(initial, {
    type: "param.set",
    nodeId: "csv",
    param: "source",
    value: "other",
  });
  const rebound = applyCommand(edited, {
    type: "sources.rebind",
    targets: [
      { nodeId: "csv", param: "source", previousSourceId: "old", sourceId: "new" },
      { nodeId: "csv", param: "source", previousSourceId: "other", sourceId: "current" },
    ],
  });
  expect(rebound.flow.nodes[0]?.params["source"]).toBe("current");
  expect(rebound.flow.nodes[0]?.params["value"]).toBe("old");
  expect(rebound.undo).toHaveLength(1);
  expect(rebound.rev).toBe(edited.rev + 1);
  expect(applyCommand(rebound, { type: "history.undo" }).flow.nodes[0]?.params["source"]).toBe(
    "new",
  );
});
