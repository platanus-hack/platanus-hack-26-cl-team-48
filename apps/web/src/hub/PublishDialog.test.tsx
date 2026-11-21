import {
  createMemoryHub,
  type Hub,
  type HubProfile,
  type PublicationDraft,
  SNAPSHOT_FORMAT,
  type Snapshot,
} from "@nodomics/hub";
import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";
import { CATALOG, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { HubContext } from "./hub-context.ts";
import { PublishDialog } from "./PublishDialog.tsx";

const ana: HubProfile = { id: "u-ana", handle: "ana", displayName: "Ana Pérez" };

const ENTRY = manifestOf("flow.node", {
  category: "Flujo",
  inputs: [],
  outputs: [],
  params: {
    type: "object",
    properties: {
      name: { type: "string" },
      inputs: { type: "array", "x-nodomics": { widget: "ports" } },
      params: { type: "array", "x-nodomics": { widget: "node-params" } },
    },
  },
  impl: { kind: "builtin", name: "flow.node" },
});
const OUTPUT = manifestOf("flow.output", {
  category: "Flujo",
  inputs: [{ id: "in", type: "any" }],
  outputs: [],
  impl: { kind: "builtin", name: "flow.output" },
});
const LOCAL_FILE = manifestOf("core.source.file", {
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

const catalog: ReadonlyArray<NodeManifest> = [...CATALOG, ENTRY, OUTPUT, LOCAL_FILE];

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const ENTRY_PARAMS = {
  name: "Ventas altas",
  inputs: [{ name: "Ventas", type: "table" }],
  params: [],
};

const plainFlow: Flow = flowOf(
  [
    withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" }),
    withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" }),
  ],
  [edgeOf("file-f", ["file", "out"], ["f", "in"])],
);

/** entry(ventas) → filter f → output "Resultado". */
const nodeFlow: Flow = flowOf(
  [
    withParams(nodeOf("e", "flow.node"), ENTRY_PARAMS),
    withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" }),
    withParams(nodeOf("o", "flow.output"), { name: "Resultado" }),
  ],
  [edgeOf("e-f", ["e", "ventas"], ["f", "in"]), edgeOf("f-o", ["f", "out"], ["o", "in"])],
);

const entryWithoutOutput: Flow = flowOf(
  [
    withParams(nodeOf("e", "flow.node"), ENTRY_PARAMS),
    withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" }),
  ],
  [edgeOf("e-f", ["e", "ventas"], ["f", "in"])],
);

const recorded: Snapshot = { format: SNAPSHOT_FORMAT, catalog: [] };

const previousDraft: PublicationDraft = {
  slug: "ventas-por-region",
  kind: "flow",
  title: "Ventas por región",
  description: "",
  tags: [],
  version: "0.1.0",
  flow: plainFlow,
  snapshot: recorded,
};

type Setup = {
  readonly flow?: Flow;
  readonly title?: string;
  readonly published?: PublicationDraft;
};

async function setup({ flow = plainFlow, title = "Ventas por región", published }: Setup = {}) {
  const memory = createMemoryHub({ profiles: [ana], now: () => "2026-11-21T00:00:00Z" });
  await memory.signIn({ kind: "provider", provider: "github" });
  if (published !== undefined) await memory.publish(published);
  const publish = vi.fn<Hub["publish"]>((draft) => memory.publish(draft));
  const hub: Hub = { ...memory, publish };
  const record = vi.fn<(includeState: boolean) => Promise<Snapshot>>(() =>
    Promise.resolve(recorded),
  );
  const onClose = vi.fn();
  render(
    <HubContext value={hub}>
      <PublishDialog
        source={{ flowId: "f1", title, flow, catalog }}
        record={record}
        onClose={onClose}
      />
    </HubContext>,
  );
  return {
    publish,
    record,
    onClose,
    dialog: screen.getByRole("dialog", { name: "Publicar en el hub" }),
  };
}

const field = (name: string) => screen.getByRole<HTMLInputElement>("textbox", { name });

async function replaceText(name: string, text: string) {
  await userEvent.clear(field(name));
  await userEvent.type(field(name), text);
}

async function waitForVersion(version: string) {
  await waitFor(() => {
    expect(field("Versión").value).toBe(version);
  });
}

async function publishAndGetDraft(publish: Mock<Hub["publish"]>) {
  await userEvent.click(screen.getByRole("button", { name: "Publicar" }));
  await waitFor(() => {
    expect(publish).toHaveBeenCalledOnce();
  });
  return publish.mock.calls[0]?.[0];
}

describe("PublishDialog fields", () => {
  it("starts with the flow's title", async () => {
    await setup();

    expect(field("Título").value).toBe("Ventas por región");
  });

  it("derives the identifier from the title", async () => {
    await setup();

    expect(field("Identificador").value).toBe("ventas-por-region");
  });

  it("updates the identifier while the title is edited", async () => {
    await setup();

    await replaceText("Título", "Mis ventas");

    expect(field("Identificador").value).toBe("mis-ventas");
  });

  it("keeps an identifier the user typed when the title changes", async () => {
    await setup();
    await replaceText("Identificador", "propio");

    await replaceText("Título", "Otro título");

    expect(field("Identificador").value).toBe("propio");
  });

  it("proposes the first version for a new publication", async () => {
    await setup();

    await waitForVersion("0.1.0");
  });

  it("proposes the next patch version after an existing publication", async () => {
    await setup({ published: previousDraft });

    await waitForVersion("0.1.1");
  });

  it("proposes the next version of the publication the identifier points to", async () => {
    await setup({ title: "Otro flujo", published: previousDraft });
    await waitForVersion("0.1.0");

    await replaceText("Identificador", "ventas-por-region");

    await waitForVersion("0.1.1");
  });

  it("publishes only the flow by default", async () => {
    await setup();

    const options = screen.getByRole("radiogroup", { name: "Qué publicar" });

    expect(within(options).getByRole("radio", { name: "Solo el flujo" })).toHaveProperty(
      "checked",
      true,
    );
    expect(within(options).getByRole("radio", { name: "Con el estado actual" })).toHaveProperty(
      "checked",
      false,
    );
  });

  it("does not warn about public data when only the flow is published", async () => {
    await setup();

    expect(screen.queryByText(/Los datos de las vistas previas serán públicos/)).toBeNull();
  });

  it("warns that preview data becomes public when publishing the current state", async () => {
    await setup();

    await userEvent.click(screen.getByRole("radio", { name: "Con el estado actual" }));

    expect(screen.getByText(/Los datos de las vistas previas serán públicos/)).toBeDefined();
  });

  it("rejects an identifier that is not lowercase letters, numbers and hyphens", async () => {
    await setup();

    await replaceText("Identificador", "Hola Mundo");

    expect(
      screen.getByRole("textbox", {
        name: "Identificador",
        description: /Usa minúsculas, números y guiones/,
      }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Publicar" })).toHaveProperty("disabled", true);
  });

  it("calls onClose when cancelled", async () => {
    const { onClose } = await setup();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("PublishDialog publishing", () => {
  it("records the flow without state by default", async () => {
    const { record } = await setup();
    await waitForVersion("0.1.0");

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(record).toHaveBeenCalledWith(false);
    });
  });

  it("records the current state when chosen", async () => {
    const { record } = await setup();
    await waitForVersion("0.1.0");
    await userEvent.click(screen.getByRole("radio", { name: "Con el estado actual" }));

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(record).toHaveBeenCalledWith(true);
    });
  });

  it("publishes a flow without an entry node as a flow with the form's details", async () => {
    const { publish } = await setup();
    await waitForVersion("0.1.0");
    await userEvent.type(field("Descripción"), "Suma las ventas");
    await userEvent.type(field("Etiquetas"), " Ventas, , Región ,norte");

    const draft = await publishAndGetDraft(publish);

    expect(draft).toMatchObject({
      kind: "flow",
      slug: "ventas-por-region",
      title: "Ventas por región",
      description: "Suma las ventas",
      tags: ["ventas", "región", "norte"],
      version: "0.1.0",
    });
    expect(draft?.manifest).toBeUndefined();
  });

  it("publishes the recorded snapshot", async () => {
    const { publish } = await setup();
    await waitForVersion("0.1.0");

    const draft = await publishAndGetDraft(publish);

    expect(draft?.snapshot).toBe(recorded);
  });

  it("removes data source references from the published flow", async () => {
    const { publish } = await setup();
    await waitForVersion("0.1.0");

    const draft = await publishAndGetDraft(publish);

    expect(draft?.flow.nodes.find(({ id }) => id === "file")?.params).not.toHaveProperty(
      "sourceId",
    );
  });

  it("publishes a flow with an entry node as a node named after the user and identifier", async () => {
    const { publish } = await setup({ flow: nodeFlow, title: "Ventas altas" });
    await waitForVersion("0.1.0");

    const draft = await publishAndGetDraft(publish);

    expect(draft).toMatchObject({
      kind: "node",
      slug: "ventas-altas",
      manifest: { id: "hub.ana.ventas-altas", version: "0.1.0" },
    });
  });

  it("links to the publication once published", async () => {
    await setup();
    await waitForVersion("0.1.0");

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect((await screen.findByRole("link", { name: "Ver en el hub" })).getAttribute("href")).toBe(
      "/hub/ana/ventas-por-region",
    );
  });

  it("explains that a version already exists", async () => {
    await setup({ published: previousDraft });
    await waitForVersion("0.1.1");
    await replaceText("Versión", "0.1.0");

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Esa versión ya existe");
  });

  it("explains that the identifier already holds another kind of publication", async () => {
    await setup({ flow: nodeFlow, title: "Ventas por región", published: previousDraft });
    await waitForVersion("0.1.1");

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("ya existe como");
  });

  it("explains that a flow with an entry but no output cannot become a node", async () => {
    const { publish } = await setup({ flow: entryWithoutOutput, title: "Incompleto" });
    await waitForVersion("0.1.0");

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "no se puede publicar como nodo",
    );
    expect(publish).not.toHaveBeenCalled();
  });
});
