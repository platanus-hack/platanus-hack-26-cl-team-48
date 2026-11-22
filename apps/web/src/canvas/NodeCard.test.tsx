import type { ResultRef } from "@nodomics/protocol";
import { statusLabel } from "@nodomics/ui";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import {
  PreviewLocationContext,
  type PreviewLocationControls,
} from "../layout/preview-location.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { BAR, CATALOG, FILTER, SAMPLE, flowOf, manifestOf, nodeOf } from "./canvas-fixtures.ts";
import { NodeCard } from "./NodeCard.tsx";
import { toNodeViews } from "./node-views.ts";

const RESULT: ResultRef = {
  id: "r1",
  rowCount: 200,
  schema: [
    { name: "region", type: "text" },
    { name: "unidades", type: "number" },
  ],
};

type CardOptions = { readonly hasResult?: boolean; readonly type?: string };

function storesWithResult({ hasResult = true, type = SAMPLE.id }: CardOptions): AppStores {
  const stores = createAppStores(flowOf([nodeOf("src", type)]));
  const { dispatch } = stores.engineStore.getState();
  dispatch({ type: "catalog.loaded", nodes: CATALOG });
  if (!hasResult) return stores;
  dispatch({ type: "run.requested", rev: 0 });
  dispatch({ type: "run.started", rev: 0, runId: "run" });
  dispatch({
    type: "node.result",
    payload: { rev: 0, runId: "run", nodeId: "src", port: "out", ref: RESULT },
  });
  dispatch({
    type: "node.status",
    payload: { rev: 0, runId: "run", nodeId: "src", state: "done" },
  });
  return stores;
}

function renderCard(location: PreviewLocationControls["location"], options: CardOptions = {}) {
  const stores = storesWithResult(options);
  const opened: string[] = [];
  const [view] = toNodeViews({
    flow: stores.flowStore.getState().state.flow,
    catalog: CATALOG,
    engine: stores.engineStore.getState().state,
  });
  if (view === undefined) throw new Error("Missing node view");
  const rendered = renderWithEngine(
    <PreviewLocationContext value={{ location, openInPanel: (nodeId) => opened.push(nodeId) }}>
      <NodeCard view={view} isSelected={false} isDragging={false} />
    </PreviewLocationContext>,
    {
      stores,
      handlers: {
        "data.view": () => ({ spec: null, sampled: false, rowCount: 0 }),
        "data.page": (params) => ({
          columns: RESULT.schema,
          rows: [
            ["Sur", 20],
            ["Norte", 23],
          ].slice(0, params.limit),
          total: RESULT.rowCount,
        }),
        "data.profile": () => ({
          columns: [
            { name: "region", type: "text", count: 200, nulls: 0, distinct: 4, bins: [] },
            {
              name: "unidades",
              type: "number",
              count: 200,
              nulls: 0,
              distinct: 30,
              min: "5",
              max: "34",
              bins: [],
            },
          ],
        }),
      },
    },
  );
  return { opened, ...rendered };
}

describe("NodeCard with the preview in the panel", () => {
  it("shows the node's name, state and the size of its result", () => {
    renderCard("panel");

    expect(screen.getByRole("group", { name: /Datos de ejemplo, Listo/ })).toBeDefined();
    expect(screen.getByText("Listo")).toBeDefined();
    expect(screen.getByText("200 filas · 2 col.")).toBeDefined();
  });

  it("selects the node to see its data in the panel", async () => {
    const { stores } = renderCard("panel");

    await userEvent.click(screen.getByRole("button", { name: "Ver datos" }));

    expect(stores.selectionStore.getState().selectedIds).toEqual(["src"]);
  });
});

describe("NodeCard with the preview in the nodes", () => {
  it("shows the first rows of the result inside the node", async () => {
    const { engine } = renderCard("nodes");

    expect(await screen.findByRole("cell", { name: "Norte" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Datos" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("2 de 200 filas")).toBeDefined();
    expect(engine.calls.find((call) => call.method === "data.page")?.params).toEqual({
      ref: "r1",
      offset: 0,
      limit: 6,
    });
  });

  it("summarizes each column in the profile", async () => {
    renderCard("nodes");

    await userEvent.click(screen.getByRole("button", { name: "Perfil" }));

    expect(await screen.findByText("4 valores distintos")).toBeDefined();
    expect(screen.getByText("5 a 34")).toBeDefined();
    expect(screen.getByText("Calculado sobre 200 filas")).toBeDefined();
  });

  it("opens the whole table in the panel", async () => {
    const { opened } = renderCard("nodes");

    await userEvent.click(screen.getByRole("button", { name: "Abrir tabla" }));

    expect(opened).toEqual(["src"]);
  });

  it("draws a view's chart and leaves exporting it to the panel", async () => {
    renderCard("nodes", { type: BAR.id });

    expect(await screen.findByRole("img", { name: "Gráfico" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Exportar gráfico" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir gráfico" })).toBeDefined();
  });

  it("asks to run the flow when the node has no result yet", async () => {
    renderCard("nodes", { hasResult: false });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Ejecuta el flujo para ver los datos de este nodo.")).toBeDefined();
  });
});

const REPO = manifestOf("core.deploy.repo", {
  name: "Repo",
  category: "Hosteo",
  icon: "git-branch",
  inputs: [],
  outputs: [{ id: "repo", type: "repo" }],
  params: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  impl: { kind: "resource", resource: "repo" },
});

const SERVICE = manifestOf("core.deploy.service", {
  name: "Servicio",
  category: "Hosteo",
  icon: "server",
  inputs: [{ id: "repo", type: "repo" }],
  outputs: [{ id: "service", type: "service" }],
  impl: { kind: "resource", resource: "service" },
});

const CATALOG_WITH_RESOURCES = [...CATALOG, REPO, SERVICE];

type ReportedState =
  { readonly state: "stale" | "done" } | { readonly state: "error"; readonly message: string };

function storesWithState(type: string, reported?: ReportedState): AppStores {
  const stores = createAppStores(flowOf([nodeOf("n", type)]));
  const { dispatch } = stores.engineStore.getState();
  dispatch({ type: "catalog.loaded", nodes: CATALOG_WITH_RESOURCES });
  if (reported === undefined) return stores;
  dispatch({ type: "run.requested", rev: 0 });
  dispatch({ type: "run.started", rev: 0, runId: "run" });
  dispatch({
    type: "node.status",
    payload:
      reported.state === "error"
        ? {
            rev: 0,
            runId: "run",
            nodeId: "n",
            state: "error",
            error: { code: "PARAM_REQUIRED", message: reported.message, param: "url" },
          }
        : { rev: 0, runId: "run", nodeId: "n", state: reported.state },
  });
  return stores;
}

async function renderNodeOfType(
  type: string,
  location: PreviewLocationControls["location"],
  reported?: ReportedState,
) {
  const stores = storesWithState(type, reported);
  const [view] = toNodeViews({
    flow: stores.flowStore.getState().state.flow,
    catalog: CATALOG_WITH_RESOURCES,
    engine: stores.engineStore.getState().state,
  });
  if (view === undefined) throw new Error("Missing node view");
  const rendered = renderWithEngine(
    <PreviewLocationContext value={{ location, openInPanel: () => undefined }}>
      <NodeCard view={view} isSelected={false} isDragging={false} />
    </PreviewLocationContext>,
    { stores },
  );
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
}

const RUN_HINT = "Ejecuta el flujo para ver los datos de este nodo.";

describe("NodeCard of a resource node", () => {
  it.each([REPO.id, SERVICE.id])(
    "does not ask %s to run the flow to see its data",
    async (type) => {
      await renderNodeOfType(type, "nodes");

      expect(screen.queryByText(RUN_HINT)).toBeNull();
    },
  );

  it("never shows a stale repo as Desactualizado", async () => {
    await renderNodeOfType(REPO.id, "panel", { state: "stale" });

    expect(screen.queryByText(statusLabel("stale"))).toBeNull();
  });

  it("shows a stale repo as not run", async () => {
    await renderNodeOfType(REPO.id, "panel", { state: "stale" });

    expect(screen.getByRole("group", { name: /Repo, Sin ejecutar/ })).toBeDefined();
  });

  it("shows a repo without news from the engine as not run", async () => {
    await renderNodeOfType(REPO.id, "panel");

    expect(screen.getByRole("group", { name: /Repo, Sin ejecutar/ })).toBeDefined();
  });

  it("shows a failed repo as error with its message", async () => {
    await renderNodeOfType(REPO.id, "panel", {
      state: "error",
      message: 'Falta el parámetro "url"',
    });

    expect(screen.getByRole("group", { name: /Repo, Error/ })).toBeDefined();
    expect(screen.getByText('Falta el parámetro "url"')).toBeDefined();
  });
});

describe("NodeCard of a data node next to resource nodes", () => {
  it("still asks to run the flow to see its data", async () => {
    await renderNodeOfType(FILTER.id, "nodes");

    expect(screen.getByText(RUN_HINT)).toBeDefined();
  });

  it("still shows a stale node as Desactualizado", async () => {
    await renderNodeOfType(FILTER.id, "panel", { state: "stale" });

    expect(screen.getByText(statusLabel("stale"))).toBeDefined();
  });
});
