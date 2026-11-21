import { SNAPSHOT_FORMAT, type Hub } from "@nodomics/hub";
import type { Flow, FlowNode } from "@nodomics/protocol";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { FILTER, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { decodeSharedFlow } from "../flow/flow-file.ts";
import { pathOf, type Route } from "../routing/routes.ts";
import {
  ANA,
  CLEAN_NODE_MANIFEST,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
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

async function renderHubApp(route: HubRoute) {
  window.history.replaceState(null, "", pathOf(route));
  return renderWithHub(<HubApp />, await seededHub());
}

/** Records the tabs the page opens instead of letting jsdom try to open them. */
const recordOpenedTabs = () => vi.spyOn(window, "open").mockReturnValue(null);

const openedUrl = (open: ReturnType<typeof recordOpenedTabs>) => {
  const [url] = open.mock.calls[0] ?? [];
  return typeof url === "string" ? url : "";
};

const sharedFlowIn = (url: string) => {
  const flow = decodeSharedFlow(url.slice(1));
  if (flow?.ok !== true) throw new Error(`The url ${url} does not carry a shared flow`);
  return flow.value;
};

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

  it("opens the editor in another tab", async () => {
    await renderHubApp({ page: "hub" });

    const link = within(hubHeader()).getByRole("link", { name: "Abrir el editor" });

    expect({
      href: link.getAttribute("href"),
      target: link.getAttribute("target"),
      isNoopener: link.getAttribute("rel")?.split(" ").includes("noopener"),
    }).toEqual({ href: "/", target: "_blank", isNoopener: true });
  });

  it("offers to sign in when signed out", async () => {
    await renderHubApp({ page: "hub" });

    expect(await within(hubHeader()).findByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("keeps the header on a publication page", async () => {
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await screen.findByRole("heading", { level: 1, name: "Ventas por región" });

    expect(within(hubHeader()).getByRole("link", { name: "Abrir el editor" })).toBeTruthy();
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

describe("HubApp profile link", () => {
  async function openProfileLink() {
    window.history.replaceState(null, "", pathOf({ page: "hub" }));
    const hub = await seededHub();
    await hub.signIn({ kind: "email", email: ANA.handle });
    renderWithHub(<HubApp />, hub);
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
  it("opens a copy of the published flow in a new editor tab", async () => {
    const open = recordOpenedTabs();
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(open).toHaveBeenCalledTimes(1);
    });

    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^\/#flow=/), "_blank", "noopener");
  });

  it("carries the published flow in the opened link", async () => {
    const open = recordOpenedTabs();
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(open).toHaveBeenCalled();
    });

    expect(sharedFlowIn(openedUrl(open)).nodes.map(({ id, type }) => ({ id, type }))).toEqual([
      { id: "file", type: LOCAL_FILE.id },
      { id: "f", type: FILTER.id },
    ]);
  });

  it("leaves the published file references out of the opened link", async () => {
    const open = recordOpenedTabs();
    await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });

    await pressUntil("Abrir una copia", () => {
      expect(open).toHaveBeenCalled();
    });

    expect(sharedFlowIn(openedUrl(open)).nodes.find(({ id }) => id === "file")?.params).toEqual({
      delimiter: ";",
    });
  });

  it("does not load the flow into this tab", async () => {
    const open = recordOpenedTabs();
    const { stores } = await renderHubApp({ page: "publication", handle: "ana", slug: "ventas" });
    const before = stores.flowStore.getState().state.flow;

    await pressUntil("Abrir una copia", () => {
      expect(open).toHaveBeenCalled();
    });

    expect({
      flow: stores.flowStore.getState().state.flow,
      path: window.location.pathname,
    }).toEqual({ flow: before, path: "/hub/ana/ventas" });
  });
});

describe("HubApp adding a node", () => {
  it("adds the published node to Mis nodos", async () => {
    const { stores } = await renderHubApp({ page: "publication", handle: "ana", slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes.map(({ id }) => id)).toContain(
        "hub.ana.limpiar",
      );
    });
  });

  it("stays on the publication after adding the node", async () => {
    const { stores } = await renderHubApp({ page: "publication", handle: "ana", slug: "limpiar" });

    await pressUntil("Agregar a Mis nodos", () => {
      expect(stores.personalLibraryStore.getState().nodes).not.toHaveLength(0);
    });

    expect({
      path: window.location.pathname,
      heading: screen.queryByRole("heading", { level: 1, name: "Limpiar texto" }) !== null,
    }).toEqual({ path: "/hub/ana/limpiar", heading: true });
  });

  it("leaves the editor's flow untouched when adding a node", async () => {
    const { stores } = await renderHubApp({ page: "publication", handle: "ana", slug: "limpiar" });
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
        expect(window.location.pathname).toBe("/hub");
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
