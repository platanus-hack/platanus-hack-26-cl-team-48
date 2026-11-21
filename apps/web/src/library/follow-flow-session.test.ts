import type { Hub, HubProfile } from "@nodomics/hub";
import { describe, expect, it, vi } from "vitest";
import type { AppStores } from "../app-stores.ts";
import { flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import {
  ANA,
  BETO,
  cloudStores,
  createFlowsHub,
  savedFlowOf,
  signedInHub,
} from "./cloud-flow-fixtures.ts";
import { startFlowSaving } from "./flow-saving.ts";
import { followFlowSession } from "./follow-flow-session.ts";

type ProfileListener = (profile: HubProfile | undefined) => void;

const FLOW = { ...flowOf([nodeOf("s", SAMPLE.id)]), name: "Sin cuenta" };

/** Stands in for the hub's session events, so each test decides when the profile changes. */
function profileEvents() {
  const listeners = new Set<ProfileListener>();
  const hub: Pick<Hub, "onProfileChange"> = {
    onProfileChange: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  const emit = (profile: HubProfile | undefined) => {
    for (const listener of listeners) listener(profile);
  };
  return { hub, emit, listeners };
}

/** Lets the in-memory hub's already-resolved promises run; nothing here waits on a clock. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function follow(stores: AppStores, initialProfileId: string | undefined) {
  const events = profileEvents();
  const saveCurrent = vi.fn(() => Promise.resolve());
  const stop = followFlowSession({
    hub: events.hub,
    stores,
    saving: { saveCurrent },
    initialProfileId,
  });
  return { ...events, saveCurrent, stop };
}

async function anaWithOpenFlow() {
  const hub = await signedInHub(ANA);
  const { stores, library } = cloudStores(hub);
  await library.saveFlow(savedFlowOf("one"));
  await stores.savedFlowStore.getState().refresh();
  await stores.savedFlowStore.getState().openFlow("one");
  return { hub, stores, library };
}

async function savedFlowsOf(profile: HubProfile, ids: ReadonlyArray<string>) {
  const hub = await signedInHub(profile);
  const { library } = cloudStores(hub);
  for (const id of ids) await library.saveFlow(savedFlowOf(id));
  await hub.signOut();
  return hub;
}

describe("followFlowSession signing out", () => {
  it("detaches the open flow, empties the list and marks the status signed out", async () => {
    const { hub, stores } = await anaWithOpenFlow();
    const { emit } = follow(stores, ANA.id);
    await hub.signOut();

    emit(undefined);

    await vi.waitFor(() => {
      expect({
        currentId: stores.savedFlowStore.getState().currentId,
        flows: stores.savedFlowStore.getState().flows,
        status: stores.savedFlowStore.getState().status,
      }).toEqual({ currentId: undefined, flows: [], status: "signed-out" });
    });
  });

  it("empties the canvas when the open flow was saved in the account", async () => {
    const { hub, stores } = await anaWithOpenFlow();
    const { emit } = follow(stores, ANA.id);
    await hub.signOut();

    emit(undefined);

    await vi.waitFor(() => {
      expect({
        nodes: stores.flowStore.getState().state.flow.nodes.length,
        currentId: stores.savedFlowStore.getState().currentId,
      }).toEqual({ nodes: 0, currentId: undefined });
    });
  });

  it("keeps on the canvas an open flow that was never saved in the account", async () => {
    const hub = await signedInHub(ANA);
    const { stores } = cloudStores(hub);
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    const { emit } = follow(stores, ANA.id);
    await hub.signOut();

    emit(undefined);
    await settle();

    expect({
      name: stores.flowStore.getState().state.flow.name,
      nodes: stores.flowStore.getState().state.flow.nodes.length,
    }).toEqual({ name: "Sin cuenta", nodes: 1 });
  });
});

describe("followFlowSession same profile", () => {
  it("does nothing when the profile emitted is the one already signed in", async () => {
    const { stores } = await anaWithOpenFlow();
    const { emit, saveCurrent } = follow(stores, ANA.id);

    emit(ANA);
    await settle();

    expect({
      currentId: stores.savedFlowStore.getState().currentId,
      saves: saveCurrent.mock.calls.length,
    }).toEqual({ currentId: "one", saves: 0 });
  });

  it("does nothing when it stays signed out", async () => {
    const { stores } = cloudStores(createFlowsHub());
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    const { emit, saveCurrent } = follow(stores, undefined);

    emit(undefined);
    await settle();

    expect(saveCurrent).not.toHaveBeenCalled();
  });
});

describe("followFlowSession signing in", () => {
  it("lists the account's flows", async () => {
    const hub = await savedFlowsOf(ANA, ["one"]);
    const { stores } = cloudStores(hub);
    await stores.savedFlowStore.getState().refresh();
    const { emit } = follow(stores, undefined);
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);

    await vi.waitFor(() => {
      expect(stores.savedFlowStore.getState().flows.map(({ id }) => id)).toEqual(["one"]);
    });
  });

  it("saves the open flow into the account when the canvas has nodes", async () => {
    const hub = createFlowsHub();
    const { stores } = cloudStores(hub);
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    const { emit, saveCurrent } = follow(stores, undefined);
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);

    await vi.waitFor(() => {
      expect(saveCurrent).toHaveBeenCalledTimes(1);
    });
  });

  it("saves the open flow as a new saved flow, not into the previous one", async () => {
    const hub = createFlowsHub();
    const { stores } = cloudStores(hub);
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    stores.savedFlowStore.setState({ currentId: "stale" });
    const { emit, saveCurrent } = follow(stores, undefined);
    const idsWhenSaving: Array<string | undefined> = [];
    saveCurrent.mockImplementation(() => {
      idsWhenSaving.push(stores.savedFlowStore.getState().currentId);
      return Promise.resolve();
    });
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);

    await vi.waitFor(() => {
      expect(idsWhenSaving).toEqual([undefined]);
    });
  });

  it("does not open another flow over the one being saved", async () => {
    const hub = await savedFlowsOf(ANA, ["one"]);
    const { stores } = cloudStores(hub);
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    const { emit, saveCurrent } = follow(stores, undefined);
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);
    await vi.waitFor(() => {
      expect(saveCurrent).toHaveBeenCalled();
    });

    expect(stores.flowStore.getState().state.flow.name).toBe("Sin cuenta");
  });

  it("opens the account's most recent flow when the canvas is empty", async () => {
    const hub = await savedFlowsOf(ANA, ["older", "newer"]);
    const { stores } = cloudStores(hub);
    const { emit, saveCurrent } = follow(stores, undefined);
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);

    await vi.waitFor(() => {
      expect({
        currentId: stores.savedFlowStore.getState().currentId,
        name: stores.flowStore.getState().state.flow.name,
        saves: saveCurrent.mock.calls.length,
      }).toEqual({ currentId: "newer", name: "newer", saves: 0 });
    });
  });

  it("leaves an empty canvas unsaved and no longer signed out when the account has no flows", async () => {
    const hub = createFlowsHub();
    const { stores } = cloudStores(hub);
    await stores.savedFlowStore.getState().refresh();
    const { emit, saveCurrent } = follow(stores, undefined);
    await hub.signIn({ kind: "email", email: ANA.handle });

    emit(ANA);
    await settle();

    expect({
      currentId: stores.savedFlowStore.getState().currentId,
      saves: saveCurrent.mock.calls.length,
      isSignedOut: stores.savedFlowStore.getState().status === "signed-out",
    }).toEqual({ currentId: undefined, saves: 0, isSignedOut: false });
  });

  it("switches to the other account's flows when a different profile signs in", async () => {
    const hub = await savedFlowsOf(BETO, ["beto-flow"]);
    await hub.signIn({ kind: "email", email: ANA.handle });
    const { stores, library } = cloudStores(hub);
    await library.saveFlow(savedFlowOf("ana-flow"));
    await stores.savedFlowStore.getState().refresh();
    const { emit } = follow(stores, ANA.id);
    await hub.signIn({ kind: "email", email: BETO.handle });

    emit(BETO);

    await vi.waitFor(() => {
      expect(stores.savedFlowStore.getState().flows.map(({ id }) => id)).toEqual(["beto-flow"]);
    });
  });
});

describe("followFlowSession with real saving", () => {
  it("saves what was edited while signed out into the account on sign in", async () => {
    const hub = createFlowsHub();
    const { stores, library } = cloudStores(hub);
    const saving = startFlowSaving({
      stores,
      timers: { set: () => 0, clear: () => undefined },
      createId: () => "flow_new",
      now: () => 7,
    });
    await stores.savedFlowStore.getState().refresh();
    stores.flowStore.getState().dispatch({ type: "flow.load", flow: FLOW });
    const events = profileEvents();
    followFlowSession({ hub: events.hub, stores, saving, initialProfileId: undefined });
    await hub.signIn({ kind: "email", email: ANA.handle });

    events.emit(ANA);

    await vi.waitFor(async () => {
      expect({
        saved: (await library.readFlow("flow_new")).value?.name,
        visibility: (await library.readFlow("flow_new")).value?.visibility,
        status: stores.savedFlowStore.getState().status,
        currentId: stores.savedFlowStore.getState().currentId,
      }).toEqual({
        saved: "Sin cuenta",
        visibility: "private",
        status: "saved",
        currentId: "flow_new",
      });
    });
    saving.close();
  });
});

describe("followFlowSession signing out and in again", () => {
  it("opens the account's saved flow instead of saving a duplicate", async () => {
    const { hub, stores, library } = await anaWithOpenFlow();
    const saving = startFlowSaving({
      stores,
      timers: { set: () => 0, clear: () => undefined },
      createId: () => "flow_duplicate",
      now: () => 7,
    });
    const events = profileEvents();
    followFlowSession({ hub: events.hub, stores, saving, initialProfileId: ANA.id });
    await hub.signOut();
    events.emit(undefined);
    await vi.waitFor(() => {
      expect(stores.savedFlowStore.getState().status).toBe("signed-out");
    });
    await settle();
    await hub.signIn({ kind: "email", email: ANA.handle });

    events.emit(ANA);

    await vi.waitFor(async () => {
      expect({
        saved: (await library.listFlows()).value.map(({ id }) => id),
        currentId: stores.savedFlowStore.getState().currentId,
      }).toEqual({ saved: ["one"], currentId: "one" });
    });
    saving.close();
  });
});

describe("followFlowSession unsubscribing", () => {
  it("stops listening to profile changes", () => {
    const { stores } = cloudStores(createFlowsHub());
    const { stop, listeners } = follow(stores, undefined);

    stop();

    expect(listeners.size).toBe(0);
  });
});
