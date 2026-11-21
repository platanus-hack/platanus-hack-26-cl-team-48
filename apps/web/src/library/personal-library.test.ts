import { describe, expect, it } from "vitest";
import { manifestOf } from "../canvas/canvas-fixtures.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createStoragePersonalLibrary, PERSONAL_NODES_KEY } from "./storage-personal-library.ts";

const NODE = manifestOf("personal.filter");

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("PersonalLibrary", () => {
  it("keeps one manifest per id in memory", () => {
    const library = createMemoryPersonalLibrary();

    library.add(NODE);
    library.add({ ...NODE, name: "Updated" });

    expect(library.read().nodes).toEqual([{ ...NODE, name: "Updated" }]);
  });

  it("persists manifests across adapter instances", () => {
    const storage = createStorage();
    createStoragePersonalLibrary(() => storage).add(NODE);

    expect(createStoragePersonalLibrary(() => storage).read().nodes).toEqual([NODE]);
    expect(storage.getItem(PERSONAL_NODES_KEY)).toBe(JSON.stringify([NODE]));
  });

  it("discards invalid entries while keeping parsed manifests", () => {
    const storage = createStorage();
    storage.setItem(PERSONAL_NODES_KEY, JSON.stringify([NODE, { id: "invalid" }]));

    expect(createStoragePersonalLibrary(() => storage).read()).toEqual({
      nodes: [NODE],
      issue: "invalid",
    });
  });

  it.each(["{", "{}", "null"])("reports corrupt storage: %s", (value) => {
    const storage = createStorage();
    storage.setItem(PERSONAL_NODES_KEY, value);

    expect(createStoragePersonalLibrary(() => storage).read()).toEqual({
      nodes: [],
      issue: "invalid",
    });
  });

  it("keeps the nodes another tab added before this one adds its own", () => {
    const storage = createStorage();
    const first = createStoragePersonalLibrary(() => storage);
    const second = createStoragePersonalLibrary(() => storage);
    second.read();
    const nodeA = manifestOf("personal.a");
    const nodeB = manifestOf("personal.b");
    first.add(nodeA);

    second.add(nodeB);

    expect({
      stored: storage.getItem(PERSONAL_NODES_KEY),
      read: createStoragePersonalLibrary(() => storage).read().nodes,
    }).toEqual({ stored: JSON.stringify([nodeA, nodeB]), read: [nodeA, nodeB] });
  });

  it("stops reporting invalid storage once another tab rewrites it with valid data", () => {
    const storage = createStorage();
    storage.setItem(PERSONAL_NODES_KEY, "{");
    const library = createStoragePersonalLibrary(() => storage);
    library.read();

    storage.setItem(PERSONAL_NODES_KEY, JSON.stringify([NODE]));

    expect(library.read()).toEqual({ nodes: [NODE] });
  });

  it("falls back to memory when accessing storage throws", () => {
    const library = createStoragePersonalLibrary(() => {
      throw new Error("blocked");
    });

    expect(library.read().issue).toBe("unavailable");
    library.add(NODE);

    expect(library.read().nodes).toEqual([NODE]);
  });

  it("keeps existing and new nodes when writing storage throws", () => {
    const storage = {
      getItem: () => JSON.stringify([NODE]),
      setItem: () => {
        throw new Error("quota");
      },
    };
    const library = createStoragePersonalLibrary(() => storage);
    const other = manifestOf("personal.other");
    library.read();

    expect(library.add(other).issue).toBe("unavailable");
    expect(library.read().nodes).toEqual([NODE, other]);
  });
});
