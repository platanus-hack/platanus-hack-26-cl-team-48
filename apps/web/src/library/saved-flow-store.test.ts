import { describe, expect, it, vi } from "vitest";
import { flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { cloudStores, createFlowsHub, savedFlowOf, signedInHub } from "./cloud-flow-fixtures.ts";

const FLOW = { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Ventas" };

function signedOutStores() {
  const { stores, library } = cloudStores(createFlowsHub());
  const show = vi.fn();
  stores.noticeStore.setState({ show });
  return { stores, library, show };
}

async function storesWithSavedFlow(visibility: "private" | "public") {
  const { stores, library } = cloudStores(await signedInHub());
  await library.saveFlow(savedFlowOf("one", { visibility }));
  await stores.savedFlowStore.getState().refresh();
  return { stores, library };
}

describe("savedFlowStore signed out", () => {
  it("sets the signed-out status when a result reports signed-out", () => {
    const { stores } = signedOutStores();

    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  });

  it("shows no notice when a result reports signed-out", () => {
    const { stores, show } = signedOutStores();

    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    expect(show).not.toHaveBeenCalled();
  });

  it("is signed out with an empty list after refreshing without a session", async () => {
    const { stores, show } = signedOutStores();

    await stores.savedFlowStore.getState().refresh();

    expect({
      status: stores.savedFlowStore.getState().status,
      flows: stores.savedFlowStore.getState().flows,
      notices: show.mock.calls.length,
    }).toEqual({ status: "signed-out", flows: [], notices: 0 });
  });

  it("is signed out after initializing without a session", async () => {
    const { stores, show } = signedOutStores();

    await stores.savedFlowStore.getState().initialize(false);

    expect({
      status: stores.savedFlowStore.getState().status,
      notices: show.mock.calls.length,
    }).toEqual({ status: "signed-out", notices: 0 });
  });

  it("stays signed out when a flow is loaded for editing", () => {
    const { stores } = signedOutStores();
    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    stores.savedFlowStore.getState().resetForLoad();

    expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  });

  it("stays signed out when a new flow is created", async () => {
    const { stores } = signedOutStores();
    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    await stores.savedFlowStore.getState().newFlow();

    expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  });

  it("stays signed out when a flow is opened from a file", async () => {
    const { stores } = signedOutStores();
    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    await stores.savedFlowStore.getState().loadFlow(FLOW);

    expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  });

  it("stays signed out when the flow is edited", () => {
    const { stores } = signedOutStores();
    stores.savedFlowStore.getState().report({ value: undefined, issue: "signed-out" });

    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    stores.flowStore.getState().dispatch({ type: "flow.rename", name: "Editado" });

    expect(stores.savedFlowStore.getState().status).toBe("signed-out");
  });
});

describe("savedFlowStore setVisibility", () => {
  it("makes a private flow public", async () => {
    const { stores, library } = await storesWithSavedFlow("private");

    await stores.savedFlowStore.getState().setVisibility("one", "public");

    expect((await library.readFlow("one")).value?.visibility).toBe("public");
  });

  it("makes a public flow private", async () => {
    const { stores, library } = await storesWithSavedFlow("public");

    await stores.savedFlowStore.getState().setVisibility("one", "private");

    expect((await library.readFlow("one")).value?.visibility).toBe("private");
  });

  it("keeps the flow's document when changing its visibility", async () => {
    const { stores, library } = await storesWithSavedFlow("private");

    await stores.savedFlowStore.getState().setVisibility("one", "public");

    expect((await library.readFlow("one")).value).toEqual({
      ...savedFlowOf("one"),
      visibility: "public",
    });
  });

  it("refreshes the listed flows with the new visibility", async () => {
    const { stores } = await storesWithSavedFlow("private");

    await stores.savedFlowStore.getState().setVisibility("one", "public");

    expect(stores.savedFlowStore.getState().flows.map(({ visibility }) => visibility)).toEqual([
      "public",
    ]);
  });
});
