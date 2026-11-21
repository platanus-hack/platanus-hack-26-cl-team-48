import { act, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { FLOW_FORMAT } from "@nodomics/protocol";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { createAppStores } from "../app-stores.ts";
import { useSourceReconnection } from "./use-source-reconnection.ts";
import { useAddSource } from "./use-engine-actions.ts";
import { Button } from "@nodomics/ui";

function Reconnect() {
  useSourceReconnection();
  return null;
}
it("uploads stored bytes and rebinds a restored source without adding undo entries", async () => {
  const stores = createAppStores({
    format: FLOW_FORMAT,
    nodes: [
      {
        version: "0.1.0",
        id: "csv",
        type: "csv",
        params: { sourceId: "old" },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  });
  const state = stores.savedFlowStore.getState();
  await state.library.saveFile({
    key: "key",
    name: "v.csv",
    size: 1,
    savedAt: 0,
    bytes: new Uint8Array([1]),
  });
  stores.savedFlowStore.setState({ files: { old: "key" } });
  stores.engineStore.getState().dispatch({
    type: "catalog.loaded",
    nodes: [
      {
        id: "csv",
        version: "1.0.0",
        name: "CSV",
        category: "Fuentes",
        inputs: [],
        outputs: [],
        params: {
          type: "object",
          properties: { sourceId: { type: "string", "x-nodomics": { widget: "source" } } },
        },
        impl: { kind: "sql", template: "" },
      },
    ],
  });
  renderWithEngine(<Reconnect />, {
    stores,
    session: { addSource: () => Promise.resolve({ sourceId: "new", name: "v.csv" }) },
  });
  await waitFor(() => {
    expect(stores.flowStore.getState().state.flow.nodes[0]?.params["sourceId"]).toBe("new");
  });
  expect(stores.flowStore.getState().state.undo).toHaveLength(0);
  expect(stores.savedFlowStore.getState().files["new"]).toBe("key");
});
function Upload({ file }: { readonly file: File }) {
  const add = useAddSource();
  return (
    <Button
      onClick={() => {
        void add?.(file);
      }}
    >
      Upload
    </Button>
  );
}
it("persists an uploaded file and tracks its engine source id", async () => {
  const file = new File(["csv"], "v.csv");
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array([1]).buffer),
  });
  const { stores, getByRole } = renderWithEngine(<Upload file={file} />, {
    session: { addSource: () => Promise.resolve({ sourceId: "new", name: "v.csv" }) },
  });
  act(() => {
    getByRole("button").click();
  });
  await waitFor(() => {
    expect(stores.savedFlowStore.getState().sessionSources.has("new")).toBe(true);
  });
  expect(stores.savedFlowStore.getState().sessionSources.has("new")).toBe(true);
  const key = stores.savedFlowStore.getState().files["new"];
  expect(key).toBeDefined();
  expect((await stores.savedFlowStore.getState().library.listFiles()).value[0]?.bytes).toEqual(
    new Uint8Array([1]),
  );
});

it("discards an upload completing after the engine session is replaced", async () => {
  const { createDeferred } = await import("../testing/deferred.ts");
  const completion = createDeferred();
  const file = new File([], "old.csv");
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array([1]).buffer),
  });
  const { stores, getByRole } = renderWithEngine(<Upload file={file} />, {
    session: {
      addSource: async () => {
        await completion.promise;
        return { sourceId: "old-session", name: file.name };
      },
    },
  });
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    stores.savedFlowStore.getState().resetSources();
  });
  await act(async () => {
    completion.resolve();
    await completion.promise;
  });
  expect(stores.savedFlowStore.getState().sessionSources.has("old-session")).toBe(false);
});

it("rebinds multiple sources atomically when new engine ids collide with old ids", async () => {
  const { manifestOf, nodeOf, flowOf } = await import("../canvas/canvas-fixtures.ts");
  const stores = createAppStores(
    flowOf([
      { ...nodeOf("a", "csv"), params: { sourceId: "first" } },
      { ...nodeOf("b", "csv"), params: { sourceId: "second" } },
    ]),
  );
  const state = stores.savedFlowStore.getState();
  for (const key of ["first", "second"])
    await state.library.saveFile({
      key,
      name: key,
      size: 1,
      savedAt: 0,
      bytes: new Uint8Array([1]),
    });
  stores.savedFlowStore.setState({ files: { first: "first", second: "second" } });
  stores.engineStore.getState().dispatch({
    type: "catalog.loaded",
    nodes: [
      manifestOf("csv", {
        params: {
          type: "object",
          properties: { sourceId: { type: "string", "x-nodomics": { widget: "source" } } },
        },
      }),
    ],
  });
  renderWithEngine(<Reconnect />, {
    stores,
    session: {
      addSource: ({ name }) =>
        Promise.resolve({ sourceId: name === "first" ? "second" : "first", name }),
    },
  });
  await waitFor(() => {
    expect(
      stores.flowStore.getState().state.flow.nodes.map((node) => node.params["sourceId"]),
    ).toEqual(["second", "first"]);
  });
});
