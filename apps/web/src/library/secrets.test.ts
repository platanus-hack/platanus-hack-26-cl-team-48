import { describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { createIdbFlowLibrary } from "./idb-flow-library.ts";

for (const [name, create] of Object.entries({
  memory: createMemoryFlowLibrary,
  indexed: () => createIdbFlowLibrary(() => new IDBFactory()),
  unavailable: () => createIdbFlowLibrary(() => undefined),
})) {
  describe(name, () => {
    it("stores, replaces, lists names and deletes credentials independently of flows", async () => {
      const library = create();
      await library.saveSecret({ name: "token", value: "first" });
      await library.saveSecret({ name: "token", value: "replacement" });

      expect((await library.listSecretNames()).value).toEqual(["token"]);
      expect((await library.readSecrets()).value).toEqual([
        { name: "token", value: "replacement" },
      ]);
      expect((await library.listFlows()).value).toEqual([]);
      await library.deleteSecret("token");
      expect((await library.readSecrets()).value).toEqual([]);
    });
  });
}

it("persists credentials across adapters without changing the existing secrets key path", async () => {
  const factory = new IDBFactory();
  await createIdbFlowLibrary(() => factory).saveSecret({ name: "token", value: "stored" });

  expect((await createIdbFlowLibrary(() => factory).readSecrets()).value).toEqual([
    { name: "token", value: "stored" },
  ]);
});

it("discards malformed credentials at the IndexedDB boundary", async () => {
  const factory = new IDBFactory();
  const library = createIdbFlowLibrary(() => factory);
  await library.listFlows();
  await new Promise<void>((resolve) => {
    const request = factory.open("nodomics", 1);
    request.onsuccess = () => {
      const transaction = request.result.transaction("secrets", "readwrite");
      transaction.objectStore("secrets").put({ key: "bad", name: "bad", value: 42 });
      transaction.oncomplete = () => {
        request.result.close();
        resolve();
      };
    };
  });

  expect(await library.readSecrets()).toEqual({ value: [], issue: "invalid" });
});
