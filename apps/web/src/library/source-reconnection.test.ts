import { expect, it } from "vitest";
import { FLOW_FORMAT, type Flow, type NodeManifest } from "@nodomics/protocol";
import { planSourceReconnection, sourceRecovery } from "./source-reconnection.ts";
import { prepareStoredFile, MAX_STORED_FILE_BYTES } from "./stored-file.ts";

const manifest: NodeManifest = {
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
};
it("plans only source parameters missing from the current engine session", () => {
  const flow: Flow = {
    format: FLOW_FORMAT,
    nodes: [
      {
        version: "0.1.0",
        id: "csv",
        type: "csv",
        params: { sourceId: "old", title: "ignored" },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  };
  expect(planSourceReconnection({ flow, catalog: [manifest], sessionSources: new Set() })).toEqual([
    "old",
  ]);
  expect(
    planSourceReconnection({ flow, catalog: [manifest], sessionSources: new Set(["old"]) }),
  ).toEqual([]);
});
it("decides between upload, permission and choosing the file again", () => {
  const file = { key: "key", name: "ventas.csv", size: 2, savedAt: 0 };
  expect(sourceRecovery(undefined)).toBe("missing");
  expect(sourceRecovery(file)).toBe("choose");
  expect(sourceRecovery({ ...file, bytes: new Uint8Array() })).toBe("upload");
});
it("stores bytes up to the limit and metadata for large files without reading them", async () => {
  const small = new File(["csv"], "ventas.csv");
  Object.defineProperty(small, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array([1]).buffer),
  });
  expect(await prepareStoredFile({ file: small, key: "key", savedAt: 1 })).toMatchObject({
    bytes: new Uint8Array([1]),
    name: "ventas.csv",
  });
  const large = new File([], "large.csv");
  Object.defineProperty(large, "size", { value: MAX_STORED_FILE_BYTES + 1 });
  expect(await prepareStoredFile({ file: large, key: "big", savedAt: 2 })).toEqual({
    key: "big",
    name: "large.csv",
    size: MAX_STORED_FILE_BYTES + 1,
    savedAt: 2,
  });
});

it("keeps a handle only for files exceeding the limit and includes the boundary in stored content", async () => {
  const file = new File([], "limite.csv");
  Object.defineProperty(file, "size", { value: MAX_STORED_FILE_BYTES, configurable: true });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array([1]).buffer),
  });
  expect((await prepareStoredFile({ file, key: "key", savedAt: 0 })).bytes).toEqual(
    new Uint8Array([1]),
  );
  Object.defineProperty(file, "size", { value: MAX_STORED_FILE_BYTES + 1 });
  const handle: FileSystemFileHandle = {
    kind: "file",
    name: file.name,
    getFile: () => Promise.resolve(file),
    isSameEntry: () => Promise.resolve(true),
    createWritable: () => Promise.reject(new Error("unused")),
  };
  expect((await prepareStoredFile({ file, key: "key", savedAt: 0, handle })).handle).toBe(handle);
  expect(sourceRecovery({ key: "key", name: file.name, size: file.size, savedAt: 0, handle })).toBe(
    "permission",
  );
});

it("finds sources inside copied personal manifests", () => {
  const inner: Flow = {
    format: FLOW_FORMAT,
    nodes: [
      {
        id: "csv",
        type: "csv",
        version: "1.0.0",
        params: { sourceId: "nested" },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  };
  const custom: NodeManifest = {
    ...manifest,
    id: "mine.nested",
    impl: { kind: "flow", graph: inner },
  };
  expect(
    planSourceReconnection({
      flow: { ...inner, nodes: [], customNodes: [custom] },
      catalog: [manifest],
      sessionSources: new Set(),
    }),
  ).toEqual(["nested"]);
});
