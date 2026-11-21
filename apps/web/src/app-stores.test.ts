import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createAppStores } from "./app-stores.ts";

const node = {
  id: "n1",
  type: "core.filter",
  version: "0.1.0",
  params: {},
  position: { x: 0, y: 0 },
};

describe("createAppStores", () => {
  it("changes the flow only through commands", () => {
    const { flowStore } = createAppStores();

    flowStore.getState().dispatch({ type: "node.add", node });

    expect(flowStore.getState().state.flow.nodes).toEqual([node]);
    expect(flowStore.getState().state.rev).toBe(1);
  });

  it("can start from a given flow", () => {
    const flow: Flow = { format: FLOW_FORMAT, nodes: [node], edges: [] };

    expect(createAppStores(flow).flowStore.getState().state.flow).toBe(flow);
  });

  it("changes the engine mirror only through engine events", () => {
    const { engineStore } = createAppStores();

    engineStore.getState().dispatch({ type: "flow.submitted", rev: 7 });

    expect(engineStore.getState().state.rev).toBe(7);
  });

  it("keeps the selected nodes", () => {
    const { selectionStore } = createAppStores();

    selectionStore.getState().select(["n1", "n2"]);

    expect(selectionStore.getState().selectedIds).toEqual(["n1", "n2"]);
  });

  it("forgets the selected nodes that leave the flow, as when another flow opens", () => {
    const stores = createAppStores({ format: FLOW_FORMAT, nodes: [node], edges: [] });
    stores.selectionStore.getState().select(["n1"]);

    stores.flowStore.getState().dispatch({
      type: "flow.load",
      flow: { format: FLOW_FORMAT, nodes: [{ ...node, id: "n2" }], edges: [] },
    });

    expect(stores.selectionStore.getState().selectedIds).toEqual([]);
  });

  it("shows and dismisses notices", () => {
    const { noticeStore } = createAppStores();

    noticeStore.getState().show({ tone: "ok", title: "Listo" });
    const shown = noticeStore.getState().notice;
    noticeStore.getState().dismiss();

    expect(shown).toEqual({ tone: "ok", title: "Listo" });
    expect(noticeStore.getState().notice).toBeUndefined();
  });
});
