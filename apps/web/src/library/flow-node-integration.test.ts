import { expect, it } from "vitest";
import { manifestOf, nodeOf, flowOf, edgeOf } from "../canvas/canvas-fixtures.ts";
import { createAppStores } from "../app-stores.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { startFlowSaving } from "./flow-saving.ts";
import { parseSavedFlow } from "./parse-saved-flow.ts";
import { connectPorts } from "../canvas/connect-ports.ts";
import { describeFormFields } from "../form/form-fields.ts";

export const ENTRY = manifestOf("flow.node", {
  inputs: [],
  outputs: [],
  impl: { kind: "builtin", name: "flow.node" },
  params: {
    type: "object",
    properties: {
      inputs: {
        type: "array",
        "x-nodomics": { widget: "ports" },
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { oneOf: [{ const: "table", title: "Tabla" }] },
          },
        },
      },
      params: { type: "array", "x-nodomics": { widget: "node-params" } },
    },
  },
});
const OUTPUT = manifestOf("flow.output", {
  outputs: [],
  impl: { kind: "builtin", name: "flow.output" },
});
const entry = {
  ...nodeOf("entry", ENTRY.id),
  params: { name: "Ventas", inputs: [{ name: "Ventas", type: "table" }] },
};
const flow = flowOf(
  [entry, nodeOf("out", OUTPUT.id)],
  [edgeOf("result", ["entry", "ventas"], ["out", "in"])],
);

it("saves, versions and removes the manifest as a flow changes", async () => {
  const library = createMemoryFlowLibrary();
  const stores = createAppStores(undefined, createMemoryPersonalLibrary(), library);
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [ENTRY, OUTPUT] });
  const saving = startFlowSaving({
    stores,
    timers: { set: () => 1, clear: () => undefined },
    createId: () => "sales",
    now: () => 1,
  });
  stores.flowStore.getState().dispatch({ type: "flow.load", flow });
  await saving.flush();
  expect((await library.readFlow("sales")).value?.node?.manifest).toMatchObject({
    id: "mine.sales",
    version: "0.1.0",
  });
  stores.flowStore
    .getState()
    .dispatch({ type: "param.set", nodeId: "entry", param: "description", value: "Nueva" });
  await saving.flush();
  expect((await library.readFlow("sales")).value?.node?.version).toBe("0.1.1");
  stores.flowStore
    .getState()
    .dispatch({ type: "param.set", nodeId: "entry", param: "name", value: "" });
  await saving.flush();
  expect((await library.readFlow("sales")).value?.node).toBeUndefined();
  saving.close();
});

it("parses a saved manifest and rejects invalid metadata", () => {
  const saved = {
    id: "sales",
    name: "Ventas",
    flow,
    files: {},
    updatedAt: 1,
    node: { version: "0.1.0", fingerprint: "abc", manifest: ENTRY },
  };
  expect(parseSavedFlow(saved)).toEqual(saved);
  expect(parseSavedFlow({ ...saved, node: { ...saved.node, manifest: {} } })).toBeUndefined();
});
it("connects ports declared by a parameter", () => {
  expect(
    connectPorts(flow, [ENTRY, OUTPUT], {
      from: { node: "entry", port: "ventas" },
      to: { node: "out", port: "in" },
    }),
  ).toBeDefined();
});
it("describes ports and exposed parameters using registered widgets", () => {
  expect(describeFormFields(ENTRY.params).map(({ widget }) => widget.kind)).toEqual([
    "object-list",
    "node-params",
  ]);
});

it("gives a duplicated node flow its own identity and initial version", async () => {
  const { stores, library } = (() => {
    const library = createMemoryFlowLibrary();
    return { library, stores: createAppStores(undefined, createMemoryPersonalLibrary(), library) };
  })();
  const manifest = manifestOf("mine.original", { version: "0.1.7" });
  await library.saveFlow({
    id: "original",
    name: "Original",
    flow,
    files: {},
    updatedAt: 1,
    node: { version: manifest.version, fingerprint: "old", manifest },
  });
  await stores.savedFlowStore.getState().duplicate("original");
  const copy = (await library.listFlows()).value.find((saved) => saved.id !== "original");
  expect(copy?.node?.manifest.id).toBe(`mine.${copy?.id ?? ""}`);
  expect(copy?.node?.version).toBe("0.1.0");
});
