import type { ResultRef } from "@nodomics/protocol";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import {
  PreviewLocationContext,
  type PreviewLocationControls,
} from "../layout/preview-location.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { BAR, CATALOG, SAMPLE, flowOf, nodeOf } from "./canvas-fixtures.ts";
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
