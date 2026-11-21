import { ReactFlowProvider } from "@xyflow/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { manifestOf } from "./canvas-fixtures.ts";
import { useCanvasDrop } from "./use-canvas-drop.ts";

function DropTarget() {
  return <div role="region" onDrop={useCanvasDrop()} />;
}

for (const extension of ["csv", "json", "parquet", "txt", "TXT"]) {
  it(`creates a file source when dropping a .${extension} file`, async () => {
    const stores = createAppStores();
    stores.engineStore.getState().dispatch({
      type: "catalog.loaded",
      nodes: [manifestOf("core.source.csv")],
    });
    const file = new File(["content"], `data.${extension}`);
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });
    renderWithEngine(
      <ReactFlowProvider>
        <DropTarget />
      </ReactFlowProvider>,
      {
        stores,
        session: { addSource: () => Promise.resolve({ sourceId: "uploaded", name: file.name }) },
      },
    );

    fireEvent.drop(screen.getByRole("region"), {
      dataTransfer: { files: [file], getData: () => "" },
      clientX: 10,
      clientY: 20,
    });

    await waitFor(() => {
      expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
    });
    expect(stores.flowStore.getState().state.flow.nodes[0]).toMatchObject({
      type: "core.source.csv",
      label: file.name,
      params: { sourceId: "uploaded" },
    });
  });
}
