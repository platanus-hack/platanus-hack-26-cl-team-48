import {
  createMemoryHub,
  SNAPSHOT_FORMAT,
  type Hub,
  type HubProfile,
  type PublicationDraft,
} from "@nodomics/hub";
import type { ReactNode } from "react";
import { FILTER, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { HubContext } from "./hub-context.ts";

export const ANA: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };
export const BETO: HubProfile = { id: "u-beto", handle: "beto", displayName: "Beto Ruiz" };
export const CARLA: HubProfile = { id: "u-carla", handle: "carla", displayName: "Carla Gómez" };

/** A hub whose clock moves one minute per call, so "newest first" is deterministic. */
export function createTestHub(): Hub {
  let minute = 0;
  return createMemoryHub({
    profiles: [ANA, BETO, CARLA],
    now: () => {
      minute += 1;
      return new Date(Date.UTC(2026, 10, 21, 10, minute)).toISOString();
    },
  });
}

export function draftOf(overrides: Partial<PublicationDraft> = {}): PublicationDraft {
  return {
    slug: "ventas",
    kind: "flow",
    title: "Ventas por región",
    description: "Suma las ventas por región",
    tags: ["comercial"],
    version: "0.1.0",
    flow: flowOf([nodeOf("f", FILTER.id)]),
    snapshot: { format: SNAPSHOT_FORMAT, catalog: [FILTER] },
    ...overrides,
  };
}

/** Publishes the drafts as `handle` and signs out, so pages are seen as a visitor. */
export async function publishAs(
  hub: Hub,
  handle: string,
  drafts: ReadonlyArray<PublicationDraft>,
): Promise<void> {
  await hub.signIn({ kind: "email", email: handle });
  for (const draft of drafts) {
    const published = await hub.publish(draft);
    if (!published.ok) throw new Error(`Could not publish ${draft.slug}: ${published.error.kind}`);
  }
  await hub.signOut();
}

export const CLEAN_NODE_MANIFEST = manifestOf("hub.ana.limpiar", {
  name: "Limpiar texto",
  impl: { kind: "flow", graph: { nodes: [nodeOf("f", FILTER.id)], edges: [] } },
});

/** Ana: a flow and a node. Beto: a flow. Carla: nothing. */
export async function createSeededHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf(),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      description: "Quita espacios y acentos",
      tags: ["texto"],
      manifest: CLEAN_NODE_MANIFEST,
    }),
  ]);
  await publishAs(hub, BETO.handle, [
    draftOf({
      slug: "clima",
      title: "Clima diario",
      description: "Temperaturas de cada día",
      tags: ["clima"],
    }),
  ]);
  return hub;
}

export function renderWithHub(ui: ReactNode, hub: Hub) {
  return renderWithStores(<HubContext value={hub}>{ui}</HubContext>);
}
