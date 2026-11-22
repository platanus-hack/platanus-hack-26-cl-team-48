import { SNAPSHOT_FORMAT, type Hub } from "@nodomics/hub";
import type { Flow, FlowNode } from "@nodomics/protocol";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FILTER, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { cloudStores, createFlowsHub } from "../library/cloud-flow-fixtures.ts";
import { pathOf, type EditorOpening, type Route } from "../routing/routes.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import {
  ANA,
  BETO,
  CLEAN_NODE_MANIFEST,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
import { HubContext } from "./hub-context.ts";
import { stubResizeObserver } from "../testing/stub-resize-observer.ts";
import { HubApp } from "./HubApp.tsx";

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

const navigationSpies = () => ({
  onOpenEditor: vi.fn<(opening: EditorOpening) => void>(),
  onOpenCopy: vi.fn<(flow: Flow) => void>(),
});

async function renderHubApp(route: HubRoute) {
  window.history.replaceState(null, "", pathOf(route));
  const navigation = navigationSpies();
  return { ...renderWithHub(<HubApp {...navigation} />, await seededHub()), ...navigation };
}

/** Ana's publications seen by Beto, signed in: copying and adding need an account. */
async function renderHubAppAsVisitor(route: HubRoute) {
  window.history.replaceState(null, "", pathOf(route));
  const hub = await seededHub();
  await hub.signIn({ kind: "email", email: BETO.handle });
  const navigation = navigationSpies();
  return { ...renderWithHub(<HubApp {...navigation} />, hub), ...navigation };
}

/** Ana's Ventas in a hub that also keeps flows, with Ana signed in. */
async function renderSignedInHubApp(route: HubRoute) {
  window.history.replaceState(null, "", pathOf(route));
  const hub = createFlowsHub();
  await publishAs(hub, ANA.handle, [
    draftOf({
      flow: PUBLISHED_FLOW,
      snapshot: { format: SNAPSHOT_FORMAT, catalog: [LOCAL_FILE, FILTER] },
    }),
  ]);
  await hub.signIn({ kind: "email", email: ANA.handle });
  const navigation = navigationSpies();
  renderWithStores(
    <HubContext value={hub}>
      <HubApp {...navigation} />
    </HubContext>,
    cloudStores(hub).stores,
  );
  return navigation;
}

/** Records the tabs the page would open instead of letting jsdom try to open them. */
const recordOpenedTabs = () => vi.spyOn(window, "open").mockReturnValue(null);

const hubHeader = () => screen.getByRole("banner");

const hubSearch = () => within(hubHeader()).getByRole("searchbox", { name: "Buscar en el hub" });

const PUBLISHED_TITLES = ["Limpiar texto", "Ventas por región"];

/** The titles of the listed cards, in alphabetical order. */
const cardTitles = () =>
  PUBLISHED_TITLES.filter((title) =>
    screen
      .queryAllByRole("article")
      .some((card) => within(card).queryByRole("link", { name: title }) !== null),
  );

const HUB_ROUTES: ReadonlyArray<{ readonly name: string; readonly route: HubRoute }> = [
  { name: "hub", route: { page: "hub" } },
  { name: "profile", route: { page: "profile", handle: "ana" } },
  { name: "publication", route: { page: "publication", handle: "ana", slug: "ventas" } },
];

const filtersSidebar = () => screen.queryByRole("complementary", { name: "Filtros del hub" });

/** The version loads after the page, so pressing is retried until the expectation holds. */
async function pressUntil(name: string, expectation: () => void) {
  const user = userEvent.setup();
  await waitFor(async () => {
    await user.click(await screen.findByRole("button", { name }));
    expectation();
  });
}

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("HubApp header", () => {
  it("names Nodomics and the Hub", async () => {
    await renderHubApp({ page: "hub" });

    expect({
      nodomics: hubHeader().textContent.includes("Nodomics"),
      hub: hubHeader().textContent.includes("Hub"),
    }).toEqual({ nodomics: true, hub: true });
  });

  it("does not offer to open the editor", async () => {
    await renderHubApp({ page: "hub" });

    await screen.findByRole("heading", { level: 1, name: "Hub" });

    expect({
      link: within(hubHeader()).queryByRole("link", { name: "Abrir el editor" }),
      button: within(hubHeader()).queryByRole("button", { name: "Abrir el editor" }),
    }).toEqual({ link: null, button: null });
  });

  it("offers to sign in when signed out", async () => {
    await renderHubApp({ page: "hub" });

    expect(await within(hubHeader()).findByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("does not offer to open the editor on a publication page", async () => {
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await screen.findByRole("heading", { level: 1, name: "Ventas por región" });

    expect({
      link: within(hubHeader()).queryByRole("link", { name: "Abrir el editor" }),
      button: within(hubHeader()).queryByRole("button", { name: "Abrir el editor" }),
    }).toEqual({ link: null, button: null });
  });

  it("does not show the editor", async () => {
    await renderHubApp({ page: "hub" });

    await screen.findByRole("heading", { level: 1, name: "Hub" });

    expect({
      canvas: screen.queryByRole("region", { name: "Lienzo del flujo" }),
      actions: screen.queryByRole("banner", { name: "Acciones del flujo" }),
    }).toEqual({ canvas: null, actions: null });
  });
});

describe("HubApp home link", () => {
  it.each<{ route: HubRoute; heading: string }>([
    { route: { page: "profile", handle: "ana" }, heading: "Ana Pérez" },
    { route: { page: "publication", handle: "ana", slug: "ventas" }, heading: "Ventas por región" },
  ])(
    "opens the Hub home when the Nodomics link is clicked from $route.page",
    async ({ route, heading }) => {
      await renderHubApp(route);
      await screen.findByRole("heading", { level: 1, name: heading });

      await userEvent.click(within(hubHeader()).getByRole("link", { name: /Nodomics/i }));

      expect(await screen.findByRole("heading", { level: 1, name: "Hub" })).toBeTruthy();
      expect(window.location.pathname).toBe(pathOf({ page: "hub" }));
    },
  );
});

describe("HubApp profile link", () => {
  async function openProfileLink() {
    window.history.replaceState(null, "", pathOf({ page: "hub" }));
    const hub = await seededHub();
    await hub.signIn({ kind: "email", email: ANA.handle });
    renderWithHub(<HubApp {...navigationSpies()} />, hub);
    await userEvent.click(
      await within(hubHeader()).findByRole("button", { name: "Cuenta de Ana Pérez" }),
    );
    return screen.getByRole("link", { name: "Mi perfil" });
  }

  it("keeps the profile link in this tab", async () => {
    const link = await openProfileLink();

    expect({ href: link.getAttribute("href"), target: link.getAttribute("target") }).toEqual({
      href: "/u/ana",
      target: null,
    });
  });

  it("shows the profile in this tab when the profile link is clicked", async () => {
    const link = await openProfileLink();

    await userEvent.click(link);

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Pérez" })).toBeTruthy();
    expect(window.location.pathname).toBe("/u/ana");
  });
});

describe("HubApp pages", () => {
  it("shows the hub search page for the hub route", async () => {
    await renderHubApp({ page: "hub" });

    expect(await screen.findByRole("heading", { level: 1, name: "Hub" })).toBeTruthy();
  });

  it("shows the profile for the profile route", async () => {
    await renderHubApp({ page: "profile", handle: "ana" });

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Pérez" })).toBeTruthy();
  });

  it("shows the publication for the publication route", async () => {
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    expect(
      await screen.findByRole("heading", { level: 1, name: "Ventas por región" }),
    ).toBeTruthy();
  });
});

describe("HubApp opening a flow", () => {
  it("hands the published flow without private params to onOpenCopy", async () => {
    const { onOpenCopy } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "ventas",
    });

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy).toHaveBeenCalledTimes(1);
    });

    expect(
      onOpenCopy.mock.calls[0]?.[0].nodes.map(({ id, type, params }) => ({ id, type, params })),
    ).toEqual([
      { id: "file", type: LOCAL_FILE.id, params: { delimiter: ";" } },
      { id: "f", type: FILTER.id, params: { op: ">", value: "10" } },
    ]);
  });

  it("leaves opening the copy to the composition root instead of opening a tab", async () => {
    const open = recordOpenedTabs();
    const { onOpenCopy } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "ventas",
    });

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(open).not.toHaveBeenCalled();
  });

  it("does not load the flow into this tab", async () => {
    const { stores, onOpenCopy } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "ventas",
    });
    const before = stores.flowStore.getState().state.flow;

    await pressUntil("Abrir una copia", () => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect({
      flow: stores.flowStore.getState().state.flow,
      path: window.location.pathname,
    }).toEqual({ flow: before, path: "/hub/ana/ventas" });
  });
});

describe("HubApp opening the editor", () => {
  it("hands a new flow to onOpenEditor from Nuevo flujo in Mis flujos", async () => {
    const { onOpenEditor } = await renderSignedInHubApp({ page: "hub" });
    await userEvent.click(
      await within(screen.getByRole("radiogroup", { name: "Explorar" })).findByRole("radio", {
        name: "Mis flujos",
      }),
    );

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo flujo" }));

    expect(onOpenEditor.mock.calls).toEqual([[{ kind: "new" }]]);
  });

  it("hands my publication's flow to onOpenEditor from Entrar", async () => {
    const { onOpenEditor } = await renderSignedInHubApp({
      page: "publication",
      handle: "ana",
      slug: "ventas",
    });
    await screen.findByRole("region", { name: "Vista previa del flujo" });

    await userEvent.click(await screen.findByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(onOpenEditor.mock.calls).toEqual([
        [{ kind: "flow", id: expect.any(String) as unknown }],
      ]);
    });
  });
});

describe("HubApp adding a node", () => {
  it("adds the published node to Mis nodos", async () => {
    const { stores } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "limpiar",
    });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes.map(({ id }) => id)).toContain(
        "hub.ana.limpiar",
      );
    });
  });

  it("stays on the publication after adding the node", async () => {
    const { stores } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "limpiar",
    });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes).not.toHaveLength(0);
    });

    expect({
      path: window.location.pathname,
      heading: screen.queryByRole("heading", { level: 1, name: "Limpiar texto" }) !== null,
    }).toEqual({ path: "/hub/ana/limpiar", heading: true });
  });

  it("leaves the editor's flow untouched when adding a node", async () => {
    const { stores } = await renderHubAppAsVisitor({
      page: "publication",
      handle: "ana",
      slug: "limpiar",
    });
    const before = stores.flowStore.getState().state.flow;

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes).not.toHaveLength(0);
    });

    expect(stores.flowStore.getState().state.flow).toBe(before);
  });
});

describe("HubApp search", () => {
  it.each(HUB_ROUTES)("offers exactly one hub search on the $name route", async ({ route }) => {
    await renderHubApp(route);

    expect(screen.getAllByRole("searchbox", { name: "Buscar en el hub" })).toHaveLength(1);
  });

  it.each(HUB_ROUTES)(
    "keeps the hub search in the header on the $name route",
    async ({ route }) => {
      await renderHubApp(route);

      expect(hubSearch()).toBeTruthy();
    },
  );

  it("hints what can be searched", async () => {
    await renderHubApp({ page: "hub" });

    expect(hubSearch().getAttribute("placeholder")).toBe("Buscar flujos, nodos o personas…");
  });

  it("narrows the hub results as the user types", async () => {
    await renderHubApp({ page: "hub" });
    await screen.findByRole("link", { name: "Ventas por región" });

    await userEvent.type(hubSearch(), "limpiar");

    await waitFor(() => {
      expect(cardTitles()).toEqual(["Limpiar texto"]);
    });
  });

  it("heads the hub results Resultados once the user types", async () => {
    await renderHubApp({ page: "hub" });

    await userEvent.type(hubSearch(), "limpiar");

    expect(await screen.findByRole("heading", { level: 2, name: "Resultados" })).toBeTruthy();
  });

  it.each([
    { name: "profile", route: { page: "profile", handle: "ana" } },
    { name: "publication", route: { page: "publication", handle: "ana", slug: "ventas" } },
  ] satisfies ReadonlyArray<{ name: string; route: HubRoute }>)(
    "goes to the hub when the user types on the $name page",
    async ({ route }) => {
      await renderHubApp(route);

      await userEvent.type(hubSearch(), "limpiar");

      await waitFor(() => {
        expect(window.location.pathname).toBe("/");
      });
    },
  );

  it.each([
    { name: "profile", route: { page: "profile", handle: "ana" } },
    { name: "publication", route: { page: "publication", handle: "ana", slug: "ventas" } },
  ] satisfies ReadonlyArray<{ name: string; route: HubRoute }>)(
    "shows the results for the text typed on the $name page",
    async ({ route }) => {
      await renderHubApp(route);

      await userEvent.type(hubSearch(), "limpiar");

      await waitFor(() => {
        expect({
          hub: screen.queryByRole("heading", { level: 1, name: "Hub" }) !== null,
          titles: cardTitles(),
        }).toEqual({ hub: true, titles: ["Limpiar texto"] });
      });
    },
  );
});

describe("HubApp filters sidebar", () => {
  it("shows the hub filters on the hub route", async () => {
    await renderHubApp({ page: "hub" });

    expect(await screen.findByRole("complementary", { name: "Filtros del hub" })).toBeTruthy();
  });

  it.each(["Explorar", "Tipo"])("groups the %s options in the hub filters", async (name) => {
    await renderHubApp({ page: "hub" });

    const sidebar = await screen.findByRole("complementary", { name: "Filtros del hub" });

    expect(within(sidebar).getByRole("radiogroup", { name })).toBeTruthy();
  });

  it("keeps the Etiquetas in the hub filters", async () => {
    await renderHubApp({ page: "hub" });
    const sidebar = await screen.findByRole("complementary", { name: "Filtros del hub" });

    expect(await within(sidebar).findByRole("group", { name: "Etiquetas" })).toBeTruthy();
  });

  it("does not show the hub filters on a profile page", async () => {
    await renderHubApp({ page: "profile", handle: "ana" });

    await screen.findByRole("heading", { level: 1, name: "Ana Pérez" });

    expect(filtersSidebar()).toBeNull();
  });

  it("does not show the hub filters on a publication page", async () => {
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await screen.findByRole("heading", { level: 1, name: "Ventas por región" });

    expect(filtersSidebar()).toBeNull();
  });
});
