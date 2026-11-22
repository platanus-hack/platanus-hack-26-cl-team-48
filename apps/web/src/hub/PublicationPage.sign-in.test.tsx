import { SNAPSHOT_FORMAT, type Hub, type Snapshot } from "@nodomics/hub";
import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FILTER, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import type { EditorOpening } from "../routing/routes.ts";
import { stubResizeObserver } from "../testing/stub-resize-observer.ts";
import {
  ANA,
  BETO,
  CLEAN_NODE_MANIFEST,
  createTestHub,
  draftOf,
  publishAs,
  renderWithHub,
} from "./hub-pages-fixtures.tsx";
import {
  keepPendingHubAction,
  takePendingHubAction,
  type PendingHubAction,
} from "./pending-hub-action.ts";
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
const FIRST_FLOW: Flow = flowOf([fileNode], []);
const LATEST_FLOW: Flow = flowOf(
  [fileNode, filterNode],
  [edgeOf("file-f", ["file", "out"], ["f", "in"])],
);
const CLEAN_FIRST_FLOW: Flow = { ...FIRST_FLOW, nodes: [cleanFileNode] };
const CLEAN_LATEST_FLOW: Flow = { ...LATEST_FLOW, nodes: [cleanFileNode, filterNode] };
const SNAPSHOT: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [LOCAL_FILE, FILTER] };

const SIGN_IN_DIALOG = "Entrar a Nodomics";
const COPY = "Abrir una copia";
const INSTALL = "Agregar a Mis nodos";
const VENTAS = { handle: ANA.handle, slug: "ventas" };
const LIMPIAR = { handle: ANA.handle, slug: "limpiar" };

/** Ana publishes Ventas 0.1.0 and 0.2.0 (a flow) and Limpiar texto 0.1.0 (a node). */
async function seededHub(): Promise<Hub> {
  const hub = createTestHub();
  await publishAs(hub, ANA.handle, [
    draftOf({ flow: FIRST_FLOW, snapshot: SNAPSHOT }),
    draftOf({ version: "0.2.0", flow: LATEST_FLOW, snapshot: SNAPSHOT }),
    draftOf({
      slug: "limpiar",
      kind: "node",
      title: "Limpiar texto",
      manifest: CLEAN_NODE_MANIFEST,
      flow: flowOf([filterNode]),
      snapshot: { format: SNAPSHOT_FORMAT, catalog: [FILTER] },
    }),
  ]);
  return hub;
}

type Visit = { readonly as?: string; readonly slug?: string };

async function visit({ as, slug = "ventas" }: Visit = {}) {
  const hub = await seededHub();
  if (as !== undefined) await hub.signIn({ kind: "email", email: as });
  const onOpenCopy = vi.fn<(flow: Flow) => void>();
  const onInstall = vi.fn<(manifests: ReadonlyArray<NodeManifest>) => void>();
  renderWithHub(
    <PublicationPage
      handle={ANA.handle}
      slug={slug}
      onOpenEditor={vi.fn<(opening: EditorOpening) => void>()}
      onOpenCopy={onOpenCopy}
      onInstall={onInstall}
    />,
    hub,
  );
  return { hub, onOpenCopy, onInstall };
}

/** The shown version arrives after the page, together with its preview. */
async function waitForVersion() {
  await screen.findByRole("region", { name: "Vista previa del flujo" });
}

async function pressOnceLoaded(name: string) {
  await waitForVersion();
  await userEvent.click(await screen.findByRole("button", { name }));
}

const signInDialog = () => screen.queryByRole("dialog", { name: SIGN_IN_DIALOG });

async function closeSignInDialog() {
  const dialog = await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });
  await userEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
}

/** As the email link or the provider would end: the hub reports the new profile. */
async function signInAs(hub: Hub, handle: string) {
  await act(async () => {
    await hub.signIn({ kind: "email", email: handle });
  });
}

const keep = (action: PendingHubAction) => {
  keepPendingHubAction(window.sessionStorage, action);
};

beforeAll(stubResizeObserver);

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
});

describe("PublicationPage Abrir una copia while signed out", () => {
  it("asks to sign in", async () => {
    await visit();

    await pressOnceLoaded(COPY);

    expect(await screen.findByRole("dialog", { name: SIGN_IN_DIALOG })).toBeTruthy();
  });

  it("does not open a copy before signing in", async () => {
    const { onOpenCopy } = await visit();

    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    expect(onOpenCopy).not.toHaveBeenCalled();
  });

  it("opens a copy of the shown version without private params once signed in", async () => {
    const { hub, onOpenCopy } = await visit();
    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);

    await waitFor(() => {
      expect(onOpenCopy.mock.calls).toEqual([[CLEAN_LATEST_FLOW]]);
    });
  });

  it("opens the copy of the version chosen in Versión once signed in", async () => {
    const { hub, onOpenCopy } = await visit();
    await waitForVersion();
    const select = await screen.findByRole("combobox", { name: "Versión" });
    await userEvent.selectOptions(select, within(select).getByRole("option", { name: /^0\.1\.0/ }));
    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);

    await waitFor(() => {
      expect(onOpenCopy.mock.calls).toEqual([[CLEAN_FIRST_FLOW]]);
    });
  });

  it("closes the sign-in dialog once signed in", async () => {
    const { hub, onOpenCopy } = await visit();
    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);
    await waitFor(() => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(signInDialog()).toBeNull();
    });
  });

  it("keeps the pending copy of the shown version to survive the provider's redirect", async () => {
    await visit();

    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    expect(takePendingHubAction(window.sessionStorage, VENTAS)).toEqual({
      kind: "copy",
      handle: "ana",
      slug: "ventas",
      version: "0.2.0",
    });
  });

  it("forgets the pending copy once it is opened after signing in", async () => {
    const { hub, onOpenCopy } = await visit();
    await pressOnceLoaded(COPY);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);
    await waitFor(() => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(takePendingHubAction(window.sessionStorage, VENTAS)).toBeUndefined();
  });
});

describe("PublicationPage Agregar a Mis nodos while signed out", () => {
  it("asks to sign in", async () => {
    await visit({ slug: "limpiar" });

    await pressOnceLoaded(INSTALL);

    expect(await screen.findByRole("dialog", { name: SIGN_IN_DIALOG })).toBeTruthy();
  });

  it("does not add the node before signing in", async () => {
    const { onInstall } = await visit({ slug: "limpiar" });

    await pressOnceLoaded(INSTALL);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    expect({
      installed: onInstall.mock.calls,
      confirmation: screen.queryByText("Agregado a Mis nodos"),
    }).toEqual({ installed: [], confirmation: null });
  });

  it("adds the node to Mis nodos once signed in", async () => {
    const { hub, onInstall } = await visit({ slug: "limpiar" });
    await pressOnceLoaded(INSTALL);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);

    await waitFor(() => {
      expect(onInstall.mock.calls).toEqual([[[CLEAN_NODE_MANIFEST]]]);
    });
  });

  it("confirms that the node was added once signed in", async () => {
    const { hub } = await visit({ slug: "limpiar" });
    await pressOnceLoaded(INSTALL);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);

    expect(await screen.findByText("Agregado a Mis nodos")).toBeTruthy();
  });

  it("closes the sign-in dialog once signed in", async () => {
    const { hub, onInstall } = await visit({ slug: "limpiar" });
    await pressOnceLoaded(INSTALL);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    await signInAs(hub, BETO.handle);
    await waitFor(() => {
      expect(onInstall).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(signInDialog()).toBeNull();
    });
  });

  it("keeps the pending install of the shown version to survive the provider's redirect", async () => {
    await visit({ slug: "limpiar" });

    await pressOnceLoaded(INSTALL);
    await screen.findByRole("dialog", { name: SIGN_IN_DIALOG });

    expect(takePendingHubAction(window.sessionStorage, LIMPIAR)).toEqual({
      kind: "install",
      handle: "ana",
      slug: "limpiar",
      version: "0.1.0",
    });
  });
});

describe("PublicationPage closing the sign-in dialog", () => {
  it("closes the dialog without opening a copy", async () => {
    const { onOpenCopy } = await visit();
    await pressOnceLoaded(COPY);

    await closeSignInDialog();

    expect({ dialog: signInDialog(), opened: onOpenCopy.mock.calls }).toEqual({
      dialog: null,
      opened: [],
    });
  });

  it("does not open the copy when signing in later", async () => {
    const { hub, onOpenCopy } = await visit();
    await pressOnceLoaded(COPY);
    await closeSignInDialog();

    await signInAs(hub, BETO.handle);

    expect(onOpenCopy).not.toHaveBeenCalled();
  });

  it("does not add the node when signing in later", async () => {
    const { hub, onInstall } = await visit({ slug: "limpiar" });
    await pressOnceLoaded(INSTALL);
    await closeSignInDialog();

    await signInAs(hub, BETO.handle);

    expect({
      installed: onInstall.mock.calls,
      confirmation: screen.queryByText("Agregado a Mis nodos"),
    }).toEqual({ installed: [], confirmation: null });
  });

  it("forgets the pending action", async () => {
    await visit();
    await pressOnceLoaded(COPY);

    await closeSignInDialog();

    expect(takePendingHubAction(window.sessionStorage, VENTAS)).toBeUndefined();
  });
});

describe("PublicationPage while signed in", () => {
  it("opens a copy right away without asking to sign in", async () => {
    const { onOpenCopy } = await visit({ as: BETO.handle });

    await pressOnceLoaded(COPY);

    await waitFor(() => {
      expect({ opened: onOpenCopy.mock.calls, dialog: signInDialog() }).toEqual({
        opened: [[CLEAN_LATEST_FLOW]],
        dialog: null,
      });
    });
  });

  it("adds the node right away without asking to sign in", async () => {
    const { onInstall } = await visit({ as: BETO.handle, slug: "limpiar" });

    await pressOnceLoaded(INSTALL);

    await waitFor(() => {
      expect({ installed: onInstall.mock.calls, dialog: signInDialog() }).toEqual({
        installed: [[[CLEAN_NODE_MANIFEST]]],
        dialog: null,
      });
    });
  });

  it("does not keep a pending action when acting right away", async () => {
    const { onOpenCopy } = await visit({ as: BETO.handle });

    await pressOnceLoaded(COPY);
    await waitFor(() => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(takePendingHubAction(window.sessionStorage, VENTAS)).toBeUndefined();
  });
});

describe("PublicationPage after the provider's redirect", () => {
  it("opens the pending copy of its version once", async () => {
    keep({ kind: "copy", ...VENTAS, version: "0.1.0" });

    const { onOpenCopy } = await visit({ as: BETO.handle });

    await waitFor(() => {
      expect(onOpenCopy.mock.calls).toEqual([[CLEAN_FIRST_FLOW]]);
    });
  });

  it("adds the pending node once and confirms it", async () => {
    keep({ kind: "install", ...LIMPIAR, version: "0.1.0" });

    const { onInstall } = await visit({ as: BETO.handle, slug: "limpiar" });

    expect(await screen.findByText("Agregado a Mis nodos")).toBeTruthy();
    expect(onInstall.mock.calls).toEqual([[[CLEAN_NODE_MANIFEST]]]);
  });

  it("forgets the pending action once it runs", async () => {
    keep({ kind: "copy", ...VENTAS, version: "0.2.0" });
    const { onOpenCopy } = await visit({ as: BETO.handle });

    await waitFor(() => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(takePendingHubAction(window.sessionStorage, VENTAS)).toBeUndefined();
  });

  it("does not ask to sign in again", async () => {
    keep({ kind: "copy", ...VENTAS, version: "0.2.0" });
    const { onOpenCopy } = await visit({ as: BETO.handle });

    await waitFor(() => {
      expect(onOpenCopy).toHaveBeenCalled();
    });

    expect(signInDialog()).toBeNull();
  });

  it("runs the pending action when the session arrives after the page", async () => {
    keep({ kind: "copy", ...VENTAS, version: "0.2.0" });
    const { hub, onOpenCopy } = await visit();
    await waitForVersion();

    await signInAs(hub, BETO.handle);

    await waitFor(() => {
      expect(onOpenCopy.mock.calls).toEqual([[CLEAN_LATEST_FLOW]]);
    });
  });

  it("does not run the pending action while signed out", async () => {
    keep({ kind: "copy", ...VENTAS, version: "0.2.0" });
    const { onOpenCopy } = await visit();

    await waitForVersion();

    expect(onOpenCopy).not.toHaveBeenCalled();
  });

  it("does not run a pending action of another publication", async () => {
    keep({ kind: "install", ...LIMPIAR, version: "0.1.0" });
    const { onOpenCopy, onInstall } = await visit({ as: BETO.handle });

    await waitForVersion();

    expect({ copied: onOpenCopy.mock.calls, installed: onInstall.mock.calls }).toEqual({
      copied: [],
      installed: [],
    });
  });

  it("leaves a pending action of another publication kept", async () => {
    keep({ kind: "install", ...LIMPIAR, version: "0.1.0" });
    await visit({ as: BETO.handle });

    await waitForVersion();

    expect(takePendingHubAction(window.sessionStorage, LIMPIAR)).toEqual({
      kind: "install",
      ...LIMPIAR,
      version: "0.1.0",
    });
  });
});
