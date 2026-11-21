import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createAppStores } from "../../app-stores.ts";
import { renderWithEngine } from "../../testing/render-with-engine.tsx";
import { SourceWidget } from "./SourceWidget.tsx";
import type { StoredFile } from "../../library/flow-library.ts";

async function setup(file: StoredFile) {
  const stores = createAppStores();
  await stores.savedFlowStore.getState().library.saveFile(file);
  await stores.savedFlowStore.getState().refresh();
  stores.savedFlowStore.setState({ files: { old: file.key } });
  renderWithEngine(
    <SourceWidget
      value="old"
      onChange={() => undefined}
      nodeId="csv"
      FieldView={() => null}
      field={{
        name: "sourceId",
        label: "Archivo",
        isRequired: true,
        defaultValue: undefined,
        widget: { kind: "source" },
      }}
      widget={{ kind: "source" }}
    />,
    { stores, session: { addSource: () => Promise.resolve({ sourceId: "new", name: file.name }) } },
  );
  return stores;
}
it("shows a saved file name and asks the user to choose missing content again", async () => {
  await setup({ key: "key", name: "ventas.csv", size: 10, savedAt: 1 });
  expect(screen.getByText("Vuelve a elegir el archivo «ventas.csv»")).toBeTruthy();
  expect(screen.getByDisplayValue("ventas.csv")).toBeTruthy();
});
it("requests access to a saved handle on a user gesture", async () => {
  const csv = new File([], "ventas.csv");
  Object.defineProperty(csv, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array([1]).buffer),
  });
  const requestPermission = vi.fn(() => Promise.resolve("granted"));
  const handle = {
    kind: "file" as const,
    name: csv.name,
    getFile: () => Promise.resolve(csv),
    isSameEntry: () => Promise.resolve(true),
    createWritable: () => Promise.reject(new Error("unused")),
  };
  const stores = await setup({
    key: "key",
    name: csv.name,
    size: 11,
    savedAt: 1,
    handle: { ...handle, ...{ requestPermission } },
  });
  fireEvent.click(screen.getByRole("button", { name: "Permitir acceso" }));
  await waitFor(() => {
    expect(stores.savedFlowStore.getState().sessionSources.has("new")).toBe(true);
  });
  expect(requestPermission).toHaveBeenCalledWith({ mode: "read" });
});

it("offers CSV, JSON, Parquet and text in the fallback file selector", async () => {
  await setup({ key: "txt", name: "lines.txt", size: 1, savedAt: 1 });

  const accept = screen.getByLabelText(/Elegir archivo/).getAttribute("accept") ?? "";
  for (const extension of [".csv", ".json", ".parquet", ".txt"])
    expect(accept).toContain(extension);
});
