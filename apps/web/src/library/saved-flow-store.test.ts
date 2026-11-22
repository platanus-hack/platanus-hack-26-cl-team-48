import type { Flow } from "@nodomics/protocol";
import { describe, expect, it, vi } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { cloudStores, createFlowsHub, savedFlowOf, signedInHub } from "./cloud-flow-fixtures.ts";
import { createCloudFlowLibrary } from "./cloud-flow-library.ts";
import { flowFingerprint } from "./flow-fingerprint.ts";
import type { SavedFlow } from "./flow-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import type { EditorOpening } from "../routing/routes.ts";

const FLOW = { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Ventas" };

function signedOutStores() {
  const { stores, library } = cloudStores(createFlowsHub());
  const show = vi.fn();
  stores.noticeStore.setState({ show });
  return { stores, library, show };
}

const PUBLISHED: NonNullable<SavedFlow["published"]> = {
  publicationId: "pub_old",
  handle: "ana",
  slug: "ventas",
  version: "0.1.0",
  fingerprint: "old-fingerprint",
  hasChanges: true,
};

const PUBLISHED_FLOW: Flow = { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Publicado" };

const LINK = {
  publicationId: "pub_1",
  handle: "ana",
  slug: "ventas",
  version: "0.2.0",
  flow: PUBLISHED_FLOW,
};

async function storesWithSavedFlow(overrides: Partial<SavedFlow> = {}) {
  const { stores, library } = cloudStores(await signedInHub());
  await library.saveFlow(savedFlowOf("one", overrides));
  await stores.savedFlowStore.getState().refresh();
  return { stores, library };
}

async function storesWithOpenFlow(overrides: Partial<SavedFlow> = {}) {
  const { stores, library } = await storesWithSavedFlow(overrides);
  await stores.savedFlowStore.getState().openFlow("one");
  return { stores, library };
}

/** Signed in with "older" saved before "newer", so "newer" is the most recent. */
async function storesWithTwoFlows(givenFlow?: Flow) {
  const hub = await signedInHub();
  const library = createCloudFlowLibrary({ flows: hub, local: createMemoryFlowLibrary() });
  const stores = createAppStores(givenFlow, createMemoryPersonalLibrary(), library);
  await library.saveFlow(savedFlowOf("older"));
  await library.saveFlow(savedFlowOf("newer"));
  return { stores, library };
}

const openState = (stores: AppStores) => ({
  currentId: stores.savedFlowStore.getState().currentId,
  flow: stores.flowStore.getState().state.flow,
});

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

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "latest" },
      hasGivenFlow: false,
    });

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

describe("savedFlowStore initialize", () => {
  it("opens the most recent flow when asked for the latest", async () => {
    const { stores } = await storesWithTwoFlows();

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "latest" },
      hasGivenFlow: false,
    });

    expect(openState(stores)).toEqual({ currentId: "newer", flow: savedFlowOf("newer").flow });
  });

  it("opens the flow it is asked for", async () => {
    const { stores } = await storesWithTwoFlows();

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "flow", id: "older" },
      hasGivenFlow: false,
    });

    expect(openState(stores)).toEqual({ currentId: "older", flow: savedFlowOf("older").flow });
  });

  it("leaves an empty unsaved canvas when the flow asked for does not exist", async () => {
    const { stores } = await storesWithTwoFlows();

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "flow", id: "missing" },
      hasGivenFlow: false,
    });

    expect({
      currentId: stores.savedFlowStore.getState().currentId,
      nodes: stores.flowStore.getState().state.flow.nodes,
    }).toEqual({ currentId: undefined, nodes: [] });
  });

  it("leaves an empty unsaved canvas when the flow asked for cannot be read", async () => {
    const { stores } = cloudStores(createFlowsHub());

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "flow", id: "older" },
      hasGivenFlow: false,
    });

    expect({
      currentId: stores.savedFlowStore.getState().currentId,
      nodes: stores.flowStore.getState().state.flow.nodes,
    }).toEqual({ currentId: undefined, nodes: [] });
  });

  it("opens nothing and leaves an empty canvas when asked for a new flow", async () => {
    const { stores } = await storesWithTwoFlows();

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "new" },
      hasGivenFlow: false,
    });

    expect({
      currentId: stores.savedFlowStore.getState().currentId,
      nodes: stores.flowStore.getState().state.flow.nodes,
    }).toEqual({ currentId: undefined, nodes: [] });
  });

  it("still lists the saved flows when asked for a new flow", async () => {
    const { stores } = await storesWithTwoFlows();

    await stores.savedFlowStore.getState().initialize({
      opening: { kind: "new" },
      hasGivenFlow: false,
    });

    expect(stores.savedFlowStore.getState().flows.map(({ id }) => id)).toEqual(["newer", "older"]);
  });

  it.each<EditorOpening>([{ kind: "latest" }, { kind: "flow", id: "older" }, { kind: "new" }])(
    "keeps a given flow unsaved whatever the opening: %j",
    async (opening) => {
      const given: Flow = { ...flowOf([nodeOf("g", SAMPLE.id)]), name: "Compartido" };
      const { stores } = await storesWithTwoFlows(given);

      await stores.savedFlowStore.getState().initialize({ opening, hasGivenFlow: true });

      expect(openState(stores)).toEqual({ currentId: undefined, flow: given });
    },
  );
});

describe("savedFlowStore markPublished", () => {
  it("links the current saved flow to the publication with the published flow's fingerprint", async () => {
    const { stores, library } = await storesWithOpenFlow();

    await stores.savedFlowStore.getState().markPublished(LINK);

    expect((await library.readFlow("one")).value?.published).toEqual({
      publicationId: "pub_1",
      handle: "ana",
      slug: "ventas",
      version: "0.2.0",
      fingerprint: flowFingerprint(PUBLISHED_FLOW),
      hasChanges: false,
    });
  });

  it("replaces an older publication link and clears its changes", async () => {
    const { stores, library } = await storesWithOpenFlow({ published: PUBLISHED });

    await stores.savedFlowStore.getState().markPublished(LINK);

    expect((await library.readFlow("one")).value?.published).toMatchObject({
      publicationId: "pub_1",
      version: "0.2.0",
      hasChanges: false,
    });
  });

  it("keeps the saved flow's name and files", async () => {
    const { stores, library } = await storesWithOpenFlow({ files: { source: "csv" } });

    await stores.savedFlowStore.getState().markPublished(LINK);

    expect((await library.readFlow("one")).value).toMatchObject({
      id: "one",
      name: "one",
      files: { source: "csv" },
    });
  });

  it("refreshes the listed flows with the publication link", async () => {
    const { stores } = await storesWithOpenFlow();

    await stores.savedFlowStore.getState().markPublished(LINK);

    expect(
      stores.savedFlowStore.getState().flows.map(({ published }) => published?.publicationId),
    ).toEqual(["pub_1"]);
  });

  it("does nothing when no saved flow is open", async () => {
    const { stores, library } = await storesWithSavedFlow();

    await stores.savedFlowStore.getState().markPublished(LINK);

    expect((await library.listFlows()).value).toEqual([savedFlowOf("one")]);
  });
});

describe("savedFlowStore duplicate", () => {
  it("creates an unpublished copy of a published flow", async () => {
    const { stores, library } = await storesWithSavedFlow({ published: PUBLISHED });

    await stores.savedFlowStore.getState().duplicate("one");

    const copies = (await library.listFlows()).value.filter(({ id }) => id !== "one");
    expect(copies.map((copy) => "published" in copy)).toEqual([false]);
  });

  it("keeps the original flow's publication link when duplicating it", async () => {
    const { stores, library } = await storesWithSavedFlow({ published: PUBLISHED });

    await stores.savedFlowStore.getState().duplicate("one");

    expect((await library.readFlow("one")).value?.published).toEqual(PUBLISHED);
  });
});
