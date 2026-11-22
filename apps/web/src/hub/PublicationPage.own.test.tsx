import { SNAPSHOT_FORMAT, type FlowStore, type Hub, type Snapshot } from "@nodomics/hub";
import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FILTER, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import {
  ANA,
  BETO,
  cloudStores,
  createFlowsHub,
  savedFlowOf,
} from "../library/cloud-flow-fixtures.ts";
import type { SavedFlow } from "../library/flow-library.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { stubResizeObserver } from "../testing/stub-resize-observer.ts";
import { HubContext } from "./hub-context.ts";
import { draftOf, publishAs } from "./hub-pages-fixtures.tsx";
import { PublicationPage } from "./PublicationPage.tsx";

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

const fileNode = withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" });
const cleanFileNode = withParams(fileNode, { delimiter: ";" });
const filterNode = withParams(
  { ...nodeOf("f", FILTER.id), position: { x: 300, y: 0 } },
  { op: ">", value: "10" },
);
const FLOW_EDGES = [edgeOf("file-f", ["file", "out"], ["f", "in"])];
const FIRST_FLOW: Flow = flowOf([filterNode], []);
const LATEST_FLOW: Flow = flowOf([fileNode, filterNode], FLOW_EDGES);
const CLEAN_LATEST_FLOW: Flow = { ...LATEST_FLOW, nodes: [cleanFileNode, filterNode] };
const SNAPSHOT: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [LOCAL_FILE, FILTER] };

/** Ana publishes Ventas 0.1.0 and 0.2.0 and Beto publishes Clima 0.1.0; nobody stays signed in. */
async function seededHub(): Promise<Hub & FlowStore> {
  const hub = createFlowsHub();
  await publishAs(hub, ANA.handle, [
    draftOf({ flow: FIRST_FLOW, snapshot: SNAPSHOT }),
    draftOf({ version: "0.2.0", flow: LATEST_FLOW, snapshot: SNAPSHOT }),
  ]);
  await publishAs(hub, BETO.handle, [
    draftOf({ slug: "clima", title: "Clima diario", flow: LATEST_FLOW, snapshot: SNAPSHOT }),
  ]);
  return hub;
}

async function publicationIdOf(hub: Hub, handle: string, slug: string): Promise<string> {
  const detail = await hub.publication(handle, slug);
  if (!detail.ok || detail.value === undefined) throw new Error(`No publication ${slug}`);
  return detail.value.id;
}

type Visit = {
  readonly as?: string;
  readonly handle?: string;
  readonly slug?: string;
  readonly flows?: (hub: Hub) => Promise<ReadonlyArray<SavedFlow>>;
};

/** Saves the flows in the account without refreshing the stores, then shows the publication. */
async function visit({ as, handle = "ana", slug = "ventas", flows }: Visit = {}) {
  const hub = await seededHub();
  const { stores, library } = cloudStores(hub);
  if (as !== undefined) await hub.signIn({ kind: "email", email: as });
  for (const flow of (await flows?.(hub)) ?? []) await library.saveFlow(flow);
  const onOpenEditor = vi.fn<(opening: EditorOpening) => void>();
  const onOpenCopy = vi.fn<(flow: Flow) => void>();
  const onInstall = vi.fn<(manifests: ReadonlyArray<NodeManifest>) => void>();
  renderWithStores(
    <HubContext value={hub}>
      <PublicationPage
        handle={handle}
        slug={slug}
        onOpenEditor={onOpenEditor}
        onOpenCopy={onOpenCopy}
        onInstall={onInstall}
      />
    </HubContext>,
    stores,
  );
  return { hub, library, onOpenEditor, onOpenCopy };
}

const linkedVentas = async (hub: Hub): Promise<ReadonlyArray<SavedFlow>> => [
  savedFlowOf("f-ventas", {
    name: "Ventas",
    published: {
      publicationId: await publicationIdOf(hub, "ana", "ventas"),
      handle: "ana",
      slug: "ventas",
      version: "0.1.0",
      fingerprint: "huella-ventas",
      hasChanges: true,
    },
  }),
];

const linkedElsewhere = (): Promise<ReadonlyArray<SavedFlow>> =>
  Promise.resolve([
    savedFlowOf("f-otra", {
      name: "Otra",
      published: {
        publicationId: "p-otra",
        handle: "ana",
        slug: "otra",
        version: "0.1.0",
        fingerprint: "huella-otra",
        hasChanges: false,
      },
    }),
  ]);

/** The flow of the shown version arrives after the page, together with its preview. */
async function pressOnceLoaded(name: string) {
  await screen.findByRole("region", { name: "Vista previa del flujo" });
  await userEvent.click(await screen.findByRole("button", { name }));
}

const isBefore = (first: HTMLElement, second: HTMLElement) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("PublicationPage of someone else", () => {
  it("offers Abrir una copia and not Entrar when signed in as someone else", async () => {
    await visit({ as: BETO.handle });

    await screen.findByRole("button", { name: "Abrir una copia" });

    expect({
      enter: screen.queryByRole("button", { name: "Entrar" }),
      copy: screen.queryByRole("button", { name: "Copiar" }),
    }).toEqual({ enter: null, copy: null });
  });

  it("offers Abrir una copia and not Entrar when signed out", async () => {
    await visit();

    await screen.findByRole("button", { name: "Abrir una copia" });

    expect(screen.queryByRole("button", { name: "Entrar" })).toBeNull();
  });
});

describe("PublicationPage of my own publication with its flow", () => {
  it("opens my flow of the publication in the editor from Entrar", async () => {
    const { onOpenEditor } = await visit({ as: ANA.handle, flows: linkedVentas });

    await pressOnceLoaded("Entrar");

    await waitFor(() => {
      expect(onOpenEditor.mock.calls).toEqual([[{ kind: "flow", id: "f-ventas" }]]);
    });
  });

  it("does not save another flow when entering my flow", async () => {
    const { library, onOpenEditor } = await visit({ as: ANA.handle, flows: linkedVentas });

    await pressOnceLoaded("Entrar");
    await waitFor(() => {
      expect(onOpenEditor).toHaveBeenCalled();
    });

    expect((await library.listFlows()).value.map(({ id }) => id)).toEqual(["f-ventas"]);
  });

  it("makes Entrar the primary action", async () => {
    await visit({ as: ANA.handle, flows: linkedVentas });

    const enter = await screen.findByRole("button", { name: "Entrar" });

    expect(enter.className).toContain("nd-btn-primary");
  });

  it("offers Copiar as a secondary action below Entrar", async () => {
    await visit({ as: ANA.handle, flows: linkedVentas });

    const copy = await screen.findByRole("button", { name: "Copiar" });

    expect({
      isSecondary: copy.className.includes("nd-btn-secondary"),
      isBelowEnter: isBefore(screen.getByRole("button", { name: "Entrar" }), copy),
    }).toEqual({ isSecondary: true, isBelowEnter: true });
  });

  it("opens a copy of the shown version without private params from Copiar", async () => {
    const { onOpenCopy } = await visit({ as: ANA.handle, flows: linkedVentas });

    await pressOnceLoaded("Copiar");

    await waitFor(() => {
      expect(onOpenCopy.mock.calls).toEqual([[CLEAN_LATEST_FLOW]]);
    });
  });

  it("does not offer Abrir una copia", async () => {
    await visit({ as: ANA.handle, flows: linkedVentas });

    await screen.findByRole("button", { name: "Entrar" });

    expect(screen.queryByRole("button", { name: "Abrir una copia" })).toBeNull();
  });
});

describe("PublicationPage of my own publication without its flow", () => {
  async function enterUnlinked(flows?: Visit["flows"]) {
    const visited = await visit({ as: ANA.handle, ...(flows === undefined ? {} : { flows }) });
    await pressOnceLoaded("Entrar");
    await waitFor(() => {
      expect(visited.onOpenEditor).toHaveBeenCalled();
    });
    const saved = (await visited.library.listFlows()).value;
    return { ...visited, saved };
  }

  it("offers Entrar as the primary action", async () => {
    await visit({ as: ANA.handle });

    const enter = await screen.findByRole("button", { name: "Entrar" });

    expect(enter.className).toContain("nd-btn-primary");
  });

  it("saves a new flow in my account named after the publication", async () => {
    const { saved } = await enterUnlinked();

    expect(saved.map(({ name }) => name)).toEqual(["Ventas por región"]);
  });

  it("saves the shown version's flow without private params", async () => {
    const { saved } = await enterUnlinked();

    expect(saved.map(({ flow }) => ({ nodes: flow.nodes, edges: flow.edges }))).toEqual([
      { nodes: CLEAN_LATEST_FLOW.nodes, edges: CLEAN_LATEST_FLOW.edges },
    ]);
  });

  it("links the new flow to the publication at the shown version, without changes", async () => {
    const { hub, saved } = await enterUnlinked();

    expect(saved.map(({ published }) => published)).toEqual([
      {
        publicationId: await publicationIdOf(hub, "ana", "ventas"),
        handle: "ana",
        slug: "ventas",
        version: "0.2.0",
        fingerprint: expect.any(String) as unknown,
        hasChanges: false,
      },
    ]);
  });

  it("opens the new flow in the editor", async () => {
    const { saved, onOpenEditor } = await enterUnlinked();

    expect(onOpenEditor.mock.calls).toEqual([[{ kind: "flow", id: saved[0]?.id }]]);
  });

  it("does not take a flow linked to another publication as this one's", async () => {
    const { saved, onOpenEditor } = await enterUnlinked(linkedElsewhere);

    expect({
      flows: saved.map(({ name }) => name).sort(),
      opened: onOpenEditor.mock.calls.map(([opening]) => opening),
    }).toEqual({
      flows: ["Otra", "Ventas por región"],
      opened: [{ kind: "flow", id: saved.find(({ name }) => name !== "Otra")?.id }],
    });
  });
});
