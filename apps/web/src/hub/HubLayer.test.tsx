import { SNAPSHOT_FORMAT, type Hub } from "@nodomics/hub";
import type { Flow, FlowNode } from "@nodomics/protocol";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FILTER, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { pathOf, type Route } from "../routing/routes.ts";
import {
  ANA,
  CLEAN_NODE_MANIFEST,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
import { HubLayer } from "./HubLayer.tsx";

type HubRoute = Exclude<Route, { page: "workspace" }>;

const LOCAL_FILE = manifestOf("core.source.file", {
  name: "Archivo local",
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: {
      sourceId: { type: "string", "x-nodomics": { widget: "source" } },
      delimiter: { type: "string" },
    },
  },
});

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const PUBLISHED_FLOW: Flow = flowOf(
  [
    withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" }),
    withParams({ ...nodeOf("f", FILTER.id), position: { x: 300, y: 0 } }, { op: ">", value: "10" }),
  ],
  [edgeOf("file-f", ["file", "out"], ["f", "in"])],
);

async function seededHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf({
      flow: PUBLISHED_FLOW,
      snapshot: { format: SNAPSHOT_FORMAT, catalog: [LOCAL_FILE, FILTER] },
    }),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      description: "Quita espacios y acentos",
      tags: ["texto"],
      manifest: CLEAN_NODE_MANIFEST,
    }),
  ]);
  return hub;
}

async function renderLayer(route: HubRoute) {
  window.history.replaceState(null, "", pathOf(route));
  return renderWithHub(<HubLayer route={route} />, await seededHub());
}

/** The version loads after the page, so pressing is retried until the expectation holds. */
async function pressUntil(name: string, expectation: () => void) {
  const user = userEvent.setup();
  await waitFor(async () => {
    await user.click(await screen.findByRole("button", { name }));
    expectation();
  });
}

// jsdom has no ResizeObserver, which the canvas preview needs to measure itself.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined")
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("HubLayer chrome", () => {
  it("has no link back to the editor of its own", async () => {
    await renderLayer({ page: "hub" });

    await screen.findByRole("heading", { level: 1, name: "Hub" });

    expect(screen.queryByRole("link", { name: "Volver al editor" })).toBeNull();
  });

  it("has no link back to the editor on a publication page", async () => {
    await renderLayer({ page: "publication", handle: "ana", slug: "ventas" });

    await screen.findByRole("heading", { level: 1, name: "Ventas por región" });

    expect(screen.queryByRole("link", { name: "Volver al editor" })).toBeNull();
  });
});

describe("HubLayer pages", () => {
  it("shows the hub search page for the hub route", async () => {
    await renderLayer({ page: "hub" });

    expect(await screen.findByRole("heading", { level: 1, name: "Hub" })).toBeTruthy();
  });

  it("shows the profile for the profile route", async () => {
    await renderLayer({ page: "profile", handle: "ana" });

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Pérez" })).toBeTruthy();
  });

  it("shows the publication for the publication route", async () => {
    await renderLayer({ page: "publication", handle: "ana", slug: "ventas" });

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ventas por región" }),
    ).toBeTruthy();
  });
});

describe("HubLayer opening a flow", () => {
  it("loads a copy of the published flow into the editor", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(
        stores.flowStore.getState().state.flow.nodes.map(({ id, type }) => ({ id, type })),
      ).toEqual([
        { id: "file", type: LOCAL_FILE.id },
        { id: "f", type: FILTER.id },
      ]);
    });
  });

  it("goes back to the editor after opening a copy", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(2);
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  it("does not load the published file references into the editor", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(2);
    });

    expect(
      stores.flowStore.getState().state.flow.nodes.find(({ id }) => id === "file")?.params,
    ).toEqual({ delimiter: ";" });
  });
});

describe("HubLayer adding a node", () => {
  it("adds the published node to Mis nodos", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes.map(({ id }) => id)).toContain(
        "hub.ana.limpiar",
      );
    });
  });

  it("stays on the publication after adding the node", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes).not.toHaveLength(0);
    });

    expect({
      path: window.location.pathname,
      heading: screen.queryByRole("heading", { level: 1, name: "Limpiar texto" }) !== null,
    }).toEqual({ path: "/hub/ana/limpiar", heading: true });
  });

  it("leaves the editor's flow untouched when adding a node", async () => {
    const { stores } = await renderLayer({ page: "publication", handle: "ana", slug: "limpiar" });
    const before = stores.flowStore.getState().state.flow;

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes).not.toHaveLength(0);
    });

    expect(stores.flowStore.getState().state.flow).toBe(before);
  });
});
