import type { Hub } from "@nodomics/hub";
import type { Flow } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { FILTER, edgeOf, flowOf, nodeOf, SAMPLE } from "../canvas/canvas-fixtures.ts";
import { EngineConnectionContext, type EngineConnection } from "../engine/engine-connection.ts";
import type { EngineSession } from "../engine/engine-session.ts";
import { createEngineState } from "../engine/engine-state.ts";
import { HubContext } from "../hub/hub-context.ts";
import { ANA, createTestHub } from "../hub/hub-pages-fixtures.tsx";
import { startFlowSaving } from "../library/flow-saving.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { ShareMenu } from "./ShareMenu.tsx";

const EDITOR_FLOW: Flow = flowOf(
  [nodeOf("s", SAMPLE.id), nodeOf("f", FILTER.id)],
  [edgeOf("s-f", ["s", "out"], ["f", "in"])],
);

const MENU_ITEMS = ["Copiar enlace", "Publicar en el hub…"];

const COLUMNS = [
  { name: "region", type: "text" as const },
  { name: "total", type: "number" as const },
];

/** An engine session that answers the preview questions for any result. */
function createFakeSession(): EngineSession {
  return {
    start: () => Promise.resolve(),
    submitFlow: () => Promise.resolve(),
    run: () => Promise.resolve(),
    inferSchema: () => Promise.resolve(),
    page: () => Promise.resolve({ columns: COLUMNS, rows: [["norte", 10]], total: 1 }),
    profile: () =>
      Promise.resolve({
        columns: COLUMNS.map(({ name, type }) => ({
          name,
          type,
          count: 1,
          nulls: 0,
          distinct: 1,
          bins: [],
        })),
      }),
    view: () => Promise.resolve({ spec: {}, rowCount: 1, sampled: false }),
    display: () => Promise.resolve({ mime: "image/png", bytes: new Uint8Array() }),
    complete: () => Promise.resolve({ items: [] }),
    addSource: ({ name }) => Promise.resolve({ sourceId: "src_1", name }),
    registerNodes: () => Promise.resolve(),
    close: () => {},
  };
}

const connectionOf = (session: EngineSession): EngineConnection => ({
  session,
  flushFlow: () => Promise.resolve(1),
});

function seedEngineResults(stores: AppStores) {
  stores.engineStore.setState({
    state: {
      ...createEngineState(),
      catalog: [SAMPLE, FILTER],
      nodes: { s: { state: "done" }, f: { state: "done" } },
      results: { f: { out: { id: "r1", rowCount: 1, schema: COLUMNS } } },
    },
  });
}

async function openSavedFlow(stores: AppStores, name: string) {
  const { library, refresh, openFlow } = stores.savedFlowStore.getState();
  await library.saveFlow({
    id: "one",
    name,
    flow: { ...EDITOR_FLOW, name },
    files: {},
    updatedAt: 1,
  });
  await refresh();
  await openFlow("one");
}

type Setup = {
  readonly isSignedIn?: boolean;
  readonly savedName?: string;
  readonly connection?: EngineConnection;
};

async function setup({ isSignedIn = false, savedName, connection }: Setup = {}) {
  const hub = createTestHub();
  if (isSignedIn) await hub.signIn({ kind: "email", email: ANA.handle });
  const stores = createAppStores(EDITOR_FLOW);
  if (savedName !== undefined) await openSavedFlow(stores, savedName);
  const menu: ReactNode = <ShareMenu />;
  renderWithStores(
    <HubContext value={hub}>
      {connection === undefined ? (
        menu
      ) : (
        <EngineConnectionContext value={connection}>{menu}</EngineConnectionContext>
      )}
    </HubContext>,
    stores,
  );
  // The signed-in profile loads asynchronously; a person cannot click before it settles.
  await act(async () => {});
  return { hub, stores };
}

const shareButton = () => screen.getByRole("button", { name: "Compartir" });

async function openMenu() {
  await userEvent.click(shareButton());
  return screen.findByRole("menu", { name: "Compartir" });
}

async function chooseItem(name: string) {
  const menu = await openMenu();
  await userEvent.click(within(menu).getByRole("menuitem", { name }));
}

async function openPublishDialog() {
  await chooseItem("Publicar en el hub…");
  return screen.findByRole("dialog", { name: "Publicar en el hub" });
}

const titleField = (dialog: HTMLElement) =>
  within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Título" });

async function publishFrom(dialog: HTMLElement) {
  await waitFor(() => {
    expect(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Versión" }).value).toBe(
      "0.1.0",
    );
  });
  await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
  await within(dialog).findByRole("link", { name: "Ver en el hub" });
}

async function latestVersionOf(hub: Hub, slug: string) {
  const detail = await hub.publication(ANA.handle, slug);
  if (!detail.ok || detail.value === undefined) throw new Error(`No publication ${slug}`);
  const [latest] = detail.value.versions;
  if (latest === undefined) throw new Error(`No versions of ${slug}`);
  const version = await hub.version(detail.value.id, latest.version);
  if (!version.ok) throw new Error(`Could not read ${slug}@${latest.version}`);
  return { detail: detail.value, summary: latest, version: version.value };
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("ShareMenu", () => {
  it("announces that the Compartir button opens a menu", async () => {
    await setup();

    expect(shareButton().getAttribute("aria-haspopup")).toBe("menu");
  });

  it("starts closed", async () => {
    await setup();

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("offers only copying the link and publishing when signed in", async () => {
    await setup({ isSignedIn: true });

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(MENU_ITEMS);
  });

  it("offers only copying the link when signed out", async () => {
    await setup();

    const menu = await openMenu();

    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Copiar enlace"]);
  });

  it("offers publishing once the user signs in", async () => {
    const { hub } = await setup();
    await act(async () => {
      await hub.signIn({ kind: "email", email: ANA.handle });
    });

    const menu = await openMenu();

    expect(within(menu).getByRole("menuitem", { name: "Publicar en el hub…" })).toBeTruthy();
  });

  it("stops offering publishing once the user signs out", async () => {
    const { hub } = await setup({ isSignedIn: true });
    await act(async () => {
      await hub.signOut();
    });

    const menu = await openMenu();

    expect(within(menu).queryByRole("menuitem", { name: "Publicar en el hub…" })).toBeNull();
  });

  it("closes with Escape", async () => {
    await setup();
    await openMenu();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("returns focus to Compartir when closed with Escape", async () => {
    await setup();
    await openMenu();

    await userEvent.keyboard("{Escape}");

    expect(document.activeElement).toBe(shareButton());
  });

  it("leaves importing flow files to the flow options", async () => {
    await setup();

    expect(screen.queryByLabelText("Importar")).toBeNull();
  });
});

describe("ShareMenu Copiar enlace", () => {
  it("puts the shared flow in the address bar", async () => {
    await setup();

    await chooseItem("Copiar enlace");

    await waitFor(() => {
      expect(window.location.hash.startsWith("#flow=")).toBe(true);
    });
  });

  it("closes the menu", async () => {
    await setup();

    await chooseItem("Copiar enlace");

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("ShareMenu Publicar en el hub…", () => {
  it("opens the publish dialog titled after the current saved flow", async () => {
    await setup({ isSignedIn: true, savedName: "Ventas" });

    const dialog = await openPublishDialog();

    expect(titleField(dialog).value).toBe("Ventas");
  });

  it("titles an unsaved flow Flujo sin título", async () => {
    await setup({ isSignedIn: true });

    const dialog = await openPublishDialog();

    expect(titleField(dialog).value).toBe("Flujo sin título");
  });

  it("publishes the editor's current flow", async () => {
    const { hub, stores } = await setup({ isSignedIn: true, savedName: "Ventas" });
    const dialog = await openPublishDialog();

    await publishFrom(dialog);

    const { detail, version } = await latestVersionOf(hub, "ventas");
    expect({ kind: detail.kind, nodeIds: version.flow.nodes.map(({ id }) => id) }).toEqual({
      kind: "flow",
      nodeIds: stores.flowStore.getState().state.flow.nodes.map(({ id }) => id),
    });
  });

  it("publishes without an engine connected", async () => {
    const { hub } = await setup({ isSignedIn: true });
    const dialog = await openPublishDialog();

    await publishFrom(dialog);

    const { version } = await latestVersionOf(hub, "flujo-sin-titulo");
    expect(version.flow.nodes.map(({ id }) => id)).toEqual(["s", "f"]);
  });

  it("publishes only the flow by default", async () => {
    const { hub, stores } = await setup({
      isSignedIn: true,
      savedName: "Ventas",
      connection: connectionOf(createFakeSession()),
    });
    act(() => {
      seedEngineResults(stores);
    });
    const dialog = await openPublishDialog();

    await publishFrom(dialog);

    expect((await latestVersionOf(hub, "ventas")).summary.hasState).toBe(false);
  });

  it("publishes the current state recorded from the engine when chosen", async () => {
    const { hub, stores } = await setup({
      isSignedIn: true,
      savedName: "Ventas",
      connection: connectionOf(createFakeSession()),
    });
    act(() => {
      seedEngineResults(stores);
    });
    const dialog = await openPublishDialog();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Con el estado actual" }));

    await publishFrom(dialog);

    expect((await latestVersionOf(hub, "ventas")).summary.hasState).toBe(true);
  });
});

describe("ShareMenu publication link", () => {
  async function publishSavedFlow() {
    const { hub, stores } = await setup({ isSignedIn: true, savedName: "Ventas" });
    await publishFrom(await openPublishDialog());
    const { detail } = await latestVersionOf(hub, "ventas");
    return { stores, publicationId: detail.id };
  }

  const savedPublication = async (stores: AppStores) =>
    (await stores.savedFlowStore.getState().library.readFlow("one")).value?.published;

  async function autosaveRenamed(stores: AppStores, name: string) {
    const saving = startFlowSaving({
      stores,
      timers: { set: () => 0, clear: () => undefined },
      createId: () => "flow_other",
      now: () => 2,
    });
    act(() => {
      stores.flowStore.getState().dispatch({ type: "flow.rename", name });
    });
    await saving.flush();
    saving.close();
  }

  it("links the open saved flow to the new publication", async () => {
    const { stores, publicationId } = await publishSavedFlow();

    await waitFor(async () => {
      expect(await savedPublication(stores)).toMatchObject({
        publicationId,
        handle: ANA.handle,
        slug: "ventas",
        version: "0.1.0",
        hasChanges: false,
      });
    });
  });

  it("records a fingerprint of the published flow", async () => {
    const { stores } = await publishSavedFlow();

    await waitFor(async () => {
      expect((await savedPublication(stores))?.fingerprint).toEqual(expect.any(String));
    });
  });

  it("shows the publication link in the listed saved flows", async () => {
    const { stores, publicationId } = await publishSavedFlow();

    await waitFor(() => {
      expect(
        stores.savedFlowStore.getState().flows.map(({ published }) => published?.publicationId),
      ).toEqual([publicationId]);
    });
  });

  it("marks the published flow as changed once an edit is autosaved", async () => {
    const { stores } = await publishSavedFlow();
    await waitFor(async () => {
      expect(await savedPublication(stores)).toBeDefined();
    });

    await autosaveRenamed(stores, "Editado");

    expect((await savedPublication(stores))?.hasChanges).toBe(true);
  });

  it("marks the published flow as unchanged once the edit is undone and autosaved", async () => {
    const { stores } = await publishSavedFlow();
    await waitFor(async () => {
      expect(await savedPublication(stores)).toBeDefined();
    });
    await autosaveRenamed(stores, "Editado");

    await autosaveRenamed(stores, "Ventas");

    expect((await savedPublication(stores))?.hasChanges).toBe(false);
  });
});
