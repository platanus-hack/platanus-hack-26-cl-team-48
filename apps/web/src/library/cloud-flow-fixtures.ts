import {
  createMemoryHub,
  type FlowStore,
  type Hub,
  type HubErrorKind,
  type HubProfile,
} from "@nodomics/hub";
import { err, ok } from "@nodomics/protocol";
import { createAppStores } from "../app-stores.ts";
import { flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { createCloudFlowLibrary } from "./cloud-flow-library.ts";
import type { SavedFlow } from "./flow-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";

export const ANA: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };
export const BETO: HubProfile = { id: "u-beto", handle: "beto", displayName: "Beto Ruiz" };

/** A memory hub whose clock moves one minute per call, so "newest first" is deterministic. */
export function createFlowsHub(): Hub & FlowStore {
  let minute = 0;
  return createMemoryHub({
    profiles: [ANA, BETO],
    now: () => {
      minute += 1;
      return new Date(Date.UTC(2026, 10, 21, 10, minute)).toISOString();
    },
  });
}

export async function signedInHub(profile: HubProfile = ANA): Promise<Hub & FlowStore> {
  const hub = createFlowsHub();
  await hub.signIn({ kind: "email", email: profile.handle });
  return hub;
}

export function savedFlowOf(id: string, overrides: Partial<SavedFlow> = {}): SavedFlow {
  return {
    id,
    name: id,
    flow: { ...flowOf([nodeOf("s", SAMPLE.id)]), name: id },
    files: {},
    updatedAt: 1,
    ...overrides,
  };
}

/** A flow store whose every call fails with `kind`. */
export function failingFlows(kind: HubErrorKind): FlowStore {
  const failure = () => Promise.resolve(err({ kind }));
  return {
    listOwnFlows: failure,
    readFlow: failure,
    saveOwnFlow: failure,
    deleteOwnFlow: failure,
  };
}

/** A flow store that only records what it is asked to save. */
export function recordingFlows() {
  const drafts: Array<Parameters<FlowStore["saveOwnFlow"]>[0]> = [];
  const flows: FlowStore = {
    listOwnFlows: () => Promise.resolve(ok([])),
    readFlow: () => Promise.resolve(ok(undefined)),
    saveOwnFlow: (draft) => {
      drafts.push(draft);
      return Promise.resolve(ok(undefined));
    },
    deleteOwnFlow: () => Promise.resolve(ok(undefined)),
  };
  return { flows, drafts };
}

/** App stores whose flows live in `hub`, as main.tsx composes them (ADR 0023). */
export function cloudStores(hub: FlowStore) {
  const library = createCloudFlowLibrary({ flows: hub, local: createMemoryFlowLibrary() });
  return { library, stores: createAppStores(undefined, createMemoryPersonalLibrary(), library) };
}
