import type { DisplayRef } from "@nodomics/protocol";
import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { flowOf, nodeOf, PYTHON } from "../canvas/canvas-fixtures.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { InNodePreview } from "./InNodePreview.tsx";
import { PreviewPanel } from "./PreviewPanel.tsx";

const figures: DisplayRef[] = [
  { id: "d1", mime: "image/png", width: 400, height: 300, title: "Ventas" },
  { id: "d2", mime: "image/png", width: 200, height: 200 },
];

function renderWithFigures(ui: React.ReactNode) {
  const stores = createAppStores(flowOf([nodeOf("py", PYTHON.id)]));
  stores.selectionStore.getState().select(["py"]);
  const { dispatch } = stores.engineStore.getState();
  dispatch({ type: "catalog.loaded", nodes: [PYTHON] });
  dispatch({ type: "run.requested", rev: 0 });
  dispatch({
    type: "node.display",
    payload: { rev: 0, runId: "r1", nodeId: "py", displays: figures },
  });
  return renderWithEngine(ui, {
    stores,
    session: {
      display: (ref) => Promise.resolve({ mime: "image/png", bytes: new Uint8Array([ref.length]) }),
    },
  });
}

describe("figures of a Python node", () => {
  it("shows the first figure inside the node, sized as the engine drew it", async () => {
    renderWithFigures(<InNodePreview nodeId="py" />);

    const image = await screen.findByRole("img", { name: "Ventas" });
    expect(image.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
    expect(image.getAttribute("width")).toBe("400");
    expect(screen.queryByRole("img", { name: "Gráfico 2 del código" })).toBeNull();
    expect(screen.getByText("1 de 2 gráficos")).toBeDefined();
  });

  it("shows every figure in the panel's chart tab", async () => {
    const rendered = renderWithFigures(<PreviewPanel />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("tab", { name: "Gráfico" }).getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByRole("img", { name: "Ventas" })).toBeDefined();
    expect(await screen.findByRole("img", { name: "Gráfico 2 del código" })).toBeDefined();
    expect(rendered.engine.calls.filter((call) => call.method === "data.view")).toEqual([]);
  });
});
