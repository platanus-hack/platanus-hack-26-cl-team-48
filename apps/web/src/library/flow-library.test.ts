import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { FLOW_FORMAT } from "@nodomics/protocol";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { createIdbFlowLibrary } from "./idb-flow-library.ts";

const saved = (id: string, updatedAt: number): import("./flow-library.ts").SavedFlow => ({
  id,
  name: id,
  flow: { format: FLOW_FORMAT, nodes: [], edges: [] },
  files: {},
  updatedAt,
});

for (const [name, create] of Object.entries({
  memory: () => createMemoryFlowLibrary(),
  indexed: () => createIdbFlowLibrary(() => new IDBFactory()),
})) {
  describe(name, () => {
    it("stores, reads, sorts and removes flows and files", async () => {
      const library = create();
      await library.saveFlow(saved("first", 1));
      await library.saveFlow(saved("last", 2));
      expect((await library.listFlows()).value.map(({ id }) => id)).toEqual(["last", "first"]);
      expect((await library.readFlow("first")).value).toEqual(saved("first", 1));
      await library.deleteFlow("first");
      expect((await library.readFlow("first")).value).toBeUndefined();
      const file = {
        key: "csv",
        name: "ventas.csv",
        size: 2,
        savedAt: 1,
        bytes: new Uint8Array([1, 2]),
      };
      await library.saveFile(file);
      expect((await library.readFile("csv")).value).toEqual(file);
      expect((await library.listFiles()).value).toEqual([file]);
      await library.deleteFile("csv");
      expect((await library.listFiles()).value).toEqual([]);
    });
  });
}

it("falls back to memory and reports unavailable when opening fails", async () => {
  const library = createIdbFlowLibrary(() => undefined);
  expect((await library.listFlows()).issue).toBe("unavailable");
  await library.saveFlow(saved("kept", 1));
  expect((await library.readFlow("kept")).value?.id).toBe("kept");
});

it("discards malformed stored records at the boundary", async () => {
  const factory = new IDBFactory();
  const library = createIdbFlowLibrary(() => factory);
  await library.listFlows();
  await new Promise<void>((resolve) => {
    const request = factory.open("nodomics", 1);
    request.onsuccess = () => {
      const transaction = request.result.transaction(["flows", "files"], "readwrite");
      transaction.objectStore("flows").put({ id: "bad", flow: {} });
      transaction.objectStore("files").put({ key: "bad", bytes: "invalid" });
      transaction.oncomplete = () => {
        request.result.close();
        resolve();
      };
    };
  });
  expect(await library.listFlows()).toEqual({ value: [], issue: "invalid" });
  expect(await library.listFiles()).toEqual({ value: [], issue: "invalid" });
});

it("keeps failed writes available in memory for the rest of the session", async () => {
  const library = createIdbFlowLibrary(() => new IDBFactory());
  const handle: FileSystemFileHandle = {
    kind: "file",
    name: "ventas.csv",
    getFile: () => Promise.resolve(new File([], "ventas.csv")),
    isSameEntry: () => Promise.resolve(true),
    createWritable: () => Promise.reject(new Error("unused")),
  };
  // fake-indexeddb uses structuredClone, which cannot clone a browser handle fake's methods.
  expect(
    (await library.saveFile({ key: "key", name: handle.name, size: 1, savedAt: 1, handle })).issue,
  ).toBe("unavailable");
  expect((await library.readFile("key")).value?.handle).toBe(handle);
});
