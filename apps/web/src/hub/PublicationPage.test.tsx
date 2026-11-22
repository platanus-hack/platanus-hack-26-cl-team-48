import { SNAPSHOT_FORMAT, type Hub, type Snapshot } from "@nodomics/hub";
import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  FILTER,
  FLOW_INPUT,
  edgeOf,
  flowOf,
  manifestOf,
  nodeOf,
} from "../canvas/canvas-fixtures.ts";
import type { EditorOpening } from "../routing/routes.ts";
import {
  ANA,
  BETO,
  CLEAN_NODE_MANIFEST,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
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
const API = manifestOf("core.source.api", {
  name: "API",
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: {
      url: { type: "string" },
      headers: { type: "array", "x-nodomics": { widget: "key-values" } },
    },
  },
});

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const fileNode = withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" });
const cleanFileNode = withParams(fileNode, { delimiter: ";" });
const apiNode = withParams(
  { ...nodeOf("api", API.id), position: { x: 0, y: 200 } },
  {
    url: "https://example.com/ventas",
    headers: [
      { name: "Accept", value: "application/json" },
      { name: "Authorization", secret: "mi-token" },
    ],
  },
);
const cleanApiNode = withParams(apiNode, {
  url: "https://example.com/ventas",
  headers: [{ name: "Accept", value: "application/json" }, { name: "Authorization" }],
});
const filterNode = withParams(
  { ...nodeOf("f", FILTER.id), position: { x: 300, y: 0 } },
  { op: ">", value: "10" },
);

const FIRST_FLOW: Flow = flowOf(
  [fileNode, filterNode],
  [edgeOf("file-f", ["file", "out"], ["f", "in"])],
);
const LATEST_FLOW: Flow = flowOf(
  [fileNode, apiNode, filterNode],
  [edgeOf("api-f", ["api", "out"], ["f", "in"])],
);

const COLUMNS = [
  { name: "region", type: "text" as const },
  { name: "total", type: "number" as const },
];
const CATALOG: ReadonlyArray<NodeManifest> = [LOCAL_FILE, API, FILTER];
const BARE_SNAPSHOT: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [...CATALOG] };
const STATE_SNAPSHOT: Snapshot = {
  ...BARE_SNAPSHOT,
  state: {
    nodes: { file: { state: "done" }, api: { state: "done" }, f: { state: "done" } },
    results: { f: { out: { id: "r1", rowCount: 2, schema: COLUMNS } } },
    displays: {},
    schemas: { f: { out: COLUMNS } },
    pages: {
      r1: {
        columns: COLUMNS,
        rows: [
          ["norte", 10],
          ["sur", 20],
        ],
        total: 2,
      },
    },
    profiles: {},
    views: {},
    figures: {},
  },
};

const flowNodeOf = (id: string, uses: ReadonlyArray<string>): NodeManifest =>
  manifestOf(id, {
    impl: {
      kind: "flow",
      graph: { nodes: uses.map((type, index) => nodeOf(`n${String(index)}`, type)), edges: [] },
    },
  });

const STEP = flowNodeOf("hub.ana.paso", ["hub.ana.sub"]);
const SUB = flowNodeOf("hub.ana.sub", [FILTER.id]);
const UNUSED = flowNodeOf("hub.ana.suelto", []);
const NODE_MANIFEST: NodeManifest = {
  ...CLEAN_NODE_MANIFEST,
  impl: { kind: "flow", graph: { nodes: [nodeOf("p", STEP.id)], edges: [] } },
};

const API_READER = manifestOf("hub.ana.lector-api", {
  impl: { kind: "flow", graph: { nodes: [apiNode], edges: [] } },
});
const READER_MANIFEST = manifestOf("hub.ana.lector", {
  name: "Lector",
  impl: {
    kind: "flow",
    graph: { nodes: [fileNode, nodeOf("c", API_READER.id)], edges: [] },
  },
});

async function seededHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf({
      tags: ["comercial", "mensual"],
      flow: FIRST_FLOW,
      snapshot: BARE_SNAPSHOT,
    }),
    draftOf({
      tags: ["comercial", "mensual"],
      version: "0.2.0",
      flow: LATEST_FLOW,
      snapshot: STATE_SNAPSHOT,
    }),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      description: "Quita espacios y acentos",
      tags: ["texto"],
      manifest: NODE_MANIFEST,
      flow: {
        ...flowOf([nodeOf("in", FLOW_INPUT.id), nodeOf("p", STEP.id)]),
        customNodes: [UNUSED, SUB, STEP],
      },
      snapshot: { format: SNAPSHOT_FORMAT, catalog: [FLOW_INPUT, FILTER] },
    }),
    draftOf({
      slug: "lector",
      kind: "node",
      title: "Lector",
      manifest: READER_MANIFEST,
      flow: {
        ...flowOf([fileNode, nodeOf("c", API_READER.id)]),
        customNodes: [API_READER],
      },
      snapshot: { format: SNAPSHOT_FORMAT, catalog: [...CATALOG, FLOW_INPUT] },
    }),
    draftOf({ slug: "simple", title: "Flujo simple", flow: FIRST_FLOW, snapshot: BARE_SNAPSHOT }),
  ]);
  return hub;
}

type PageProps = Partial<Parameters<typeof PublicationPage>[0]>;

/** Signed in as someone else: Abrir una copia and Agregar a Mis nodos need an account. */
async function renderPage(props: PageProps = {}) {
  const hub = await seededHub();
  await hub.signIn({ kind: "email", email: BETO.handle });
  const onOpenCopy = vi.fn<(flow: Flow) => void>();
  const onInstall = vi.fn<(manifests: ReadonlyArray<NodeManifest>) => void>();
  renderWithHub(
    <PublicationPage
      handle="ana"
      slug="ventas"
      onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
      onOpenCopy={onOpenCopy}
      onInstall={onInstall}
      {...props}
    />,
    hub,
  );
  return { onOpenCopy, onInstall };
}

const versionSelect = () => screen.findByRole("combobox", { name: "Versión" });

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

describe("PublicationPage", () => {
  it("shows the publication's title as the heading", async () => {
    await renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ventas por región" }),
    ).toBeTruthy();
  });

  it("links the owner's handle to their profile", async () => {
    await renderPage();

    const link = await screen.findByRole("link", { name: "@ana" });

    expect(link.getAttribute("href")).toBe("/u/ana");
  });

  it("shows the description and the tags", async () => {
    await renderPage();

    await screen.findByRole("heading", { level: 1, name: "Ventas por región" });

    expect({
      description: screen.queryByText("Suma las ventas por región") !== null,
      tags: ["comercial", "mensual"].map((tag) => screen.queryByText(tag) !== null),
    }).toEqual({ description: true, tags: [true, true] });
  });

  it("lists every version newest first and marks the ones published with state", async () => {
    await renderPage();

    const options = within(await versionSelect()).getAllByRole("option");

    expect(
      options.map((option) => ({
        version: option.textContent.match(/\d+\.\d+\.\d+/)?.[0],
        hasState: option.textContent.includes("con estado"),
      })),
    ).toEqual([
      { version: "0.2.0", hasState: true },
      { version: "0.1.0", hasState: false },
    ]);
  });

  it("selects the latest version", async () => {
    await renderPage();

    const [latest] = within(await versionSelect()).getAllByRole<HTMLOptionElement>("option");

    expect(latest?.selected).toBe(true);
  });

  it("opens a copy of the latest version's flow without private params", async () => {
    const { onOpenCopy } = await renderPage();

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy.mock.lastCall).toEqual([
        { ...LATEST_FLOW, nodes: [cleanFileNode, cleanApiNode, filterNode] },
      ]);
    });
  });

  it("opens a copy of the version chosen in Versión", async () => {
    const user = userEvent.setup();
    const { onOpenCopy } = await renderPage();
    const older = within(await versionSelect()).getByRole("option", { name: /^0\.1\.0/ });

    await user.selectOptions(await versionSelect(), older);
    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy.mock.lastCall).toEqual([
        { ...FIRST_FLOW, nodes: [cleanFileNode, filterNode] },
      ]);
    });
  });

  it("does not offer to add a flow publication to Mis nodos", async () => {
    await renderPage();

    await screen.findByRole("button", { name: "Abrir una copia" });

    expect(screen.queryByRole("button", { name: "Agregar a Mis nodos" })).toBeNull();
  });

  it("installs a node with the custom nodes it uses inside, the published one first", async () => {
    const { onInstall } = await renderPage({ slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(onInstall.mock.lastCall).toEqual([[NODE_MANIFEST, STEP, SUB]]);
    });
  });

  it("installs a node and the custom nodes it uses without private params", async () => {
    const { onInstall } = await renderPage({ slug: "lector" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(onInstall.mock.lastCall).toEqual([
        [
          {
            ...READER_MANIFEST,
            impl: {
              kind: "flow",
              graph: { nodes: [cleanFileNode, nodeOf("c", API_READER.id)], edges: [] },
            },
          },
          { ...API_READER, impl: { kind: "flow", graph: { nodes: [cleanApiNode], edges: [] } } },
        ],
      ]);
    });
  });

  it("confirms that the node was added to Mis nodos", async () => {
    const { onInstall } = await renderPage({ slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(onInstall).toHaveBeenCalled();
    });

    expect(await screen.findByText("Agregado a Mis nodos")).toBeTruthy();
  });

  it("also offers to open a copy of a node publication", async () => {
    await renderPage({ slug: "limpiar" });

    expect(await screen.findByRole("button", { name: "Abrir una copia" })).toBeTruthy();
  });

  it("says the publication does not exist for an unknown slug", async () => {
    await renderPage({ slug: "no-existe" });

    expect(await screen.findByText("No existe esta publicación")).toBeTruthy();
  });

  it("says the publication does not exist for an unknown owner", async () => {
    await renderPage({ handle: "nadie" });

    expect(await screen.findByText("No existe esta publicación")).toBeTruthy();
  });

  it("renders the preview of a version published with state", async () => {
    const { onOpenCopy } = await renderPage();

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { level: 1, name: "Ventas por región" })).toBeTruthy();
  });

  it("renders the preview of a version published without state", async () => {
    const { onOpenCopy } = await renderPage({ slug: "simple" });

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { level: 1, name: "Flujo simple" })).toBeTruthy();
  });
});
