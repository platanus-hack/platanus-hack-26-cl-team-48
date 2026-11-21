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
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { HubContext } from "./hub-context.ts";
import { ANA, createTestHub } from "./hub-pages-fixtures.tsx";
import { HubToolbarActions } from "./HubToolbarActions.tsx";

const EDITOR_FLOW: Flow = flowOf(
  [nodeOf("s", SAMPLE.id), nodeOf("f", FILTER.id)],
  [edgeOf("s-f", ["s", "out"], ["f", "in"])],
);

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
  const toolbar: ReactNode = <HubToolbarActions />;
  renderWithStores(
    <HubContext value={hub}>
      {connection === undefined ? (
        toolbar
      ) : (
        <EngineConnectionContext value={connection}>{toolbar}</EngineConnectionContext>
      )}
    </HubContext>,
    stores,
  );
  if (isSignedIn) await screen.findByRole("button", { name: `Cuenta de ${ANA.displayName}` });
  return { hub, stores };
}

async function openPublishDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
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

describe("HubToolbarActions links", () => {
  it("links to the hub", async () => {
    await setup();

    expect(screen.getByRole("link", { name: "Hub" }).getAttribute("href")).toBe("/hub");
  });

  it("offers to sign in when signed out", async () => {
    await setup();

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("shows the account when signed in", async () => {
    await setup({ isSignedIn: true });

    expect(screen.getByRole("button", { name: "Cuenta de Ana Pérez" })).toBeTruthy();
  });
});

describe("HubToolbarActions Publicar", () => {
  it("asks to sign in before publishing when signed out", async () => {
    await setup();
    await screen.findByRole("button", { name: "Entrar" });

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(await screen.findByRole("dialog", { name: "Entrar a Nodomics" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Publicar en el hub" })).toBeNull();
  });

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
