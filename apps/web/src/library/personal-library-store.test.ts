import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it, vi } from "vitest";
import { manifestOf } from "../canvas/canvas-fixtures.ts";
import { MESSAGES } from "../messages.ts";
import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { createPersonalLibraryStore } from "./personal-library-store.ts";
import { createStoragePersonalLibrary } from "./storage-personal-library.ts";

const FIRST = manifestOf("hub.first", { name: "First" });
const SECOND = manifestOf("hub.second", { name: "Second" });

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function idsOf(nodes: ReadonlyArray<NodeManifest>): ReadonlyArray<string> {
  return nodes.map((node) => node.id);
}

describe("install", () => {
  it("adds every manifest to the store nodes in order", () => {
    const store = createPersonalLibraryStore(createMemoryPersonalLibrary(), vi.fn());

    store.getState().install([FIRST, SECOND]);

    expect(store.getState().nodes).toEqual([FIRST, SECOND]);
  });

  it("keeps nodes already in the library", () => {
    const existing = manifestOf("personal.existing");
    const store = createPersonalLibraryStore(createMemoryPersonalLibrary([existing]), vi.fn());

    store.getState().install([FIRST]);

    expect(store.getState().nodes).toEqual([existing, FIRST]);
  });

  it("adds the manifests to the library port", () => {
    const library = createMemoryPersonalLibrary();
    const store = createPersonalLibraryStore(library, vi.fn());

    store.getState().install([FIRST, SECOND]);

    expect(library.read().nodes).toEqual([FIRST, SECOND]);
  });

  it("replaces a node whose id is already installed", () => {
    const newer = { ...FIRST, version: "2.0.0", name: "First v2" };
    const store = createPersonalLibraryStore(createMemoryPersonalLibrary([FIRST]), vi.fn());

    store.getState().install([newer]);

    expect(store.getState().nodes).toEqual([newer]);
  });

  it("keeps the last manifest when the same id appears twice in one install", () => {
    const newer = { ...FIRST, name: "First v2" };
    const store = createPersonalLibraryStore(createMemoryPersonalLibrary(), vi.fn());

    store.getState().install([FIRST, newer]);

    expect(store.getState().nodes).toEqual([newer]);
  });

  it("leaves nodes unchanged when installing nothing", () => {
    const store = createPersonalLibraryStore(createMemoryPersonalLibrary([FIRST]), vi.fn());

    store.getState().install([]);

    expect(store.getState().nodes).toEqual([FIRST]);
  });

  it("persists installed nodes for a new store over the same storage", () => {
    const storage = createStorage();
    createPersonalLibraryStore(
      createStoragePersonalLibrary(() => storage),
      vi.fn(),
    )
      .getState()
      .install([FIRST, SECOND]);

    const reopened = createPersonalLibraryStore(
      createStoragePersonalLibrary(() => storage),
      vi.fn(),
    );

    expect(idsOf(reopened.getState().nodes)).toEqual([FIRST.id, SECOND.id]);
  });

  it("does not show a notice when installing succeeds", () => {
    const show = vi.fn();
    const store = createPersonalLibraryStore(
      createStoragePersonalLibrary(() => createStorage()),
      show,
    );

    store.getState().install([FIRST]);

    expect(show).not.toHaveBeenCalled();
  });

  it("shows an unavailable warning when the library cannot persist", () => {
    const show = vi.fn();
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const store = createPersonalLibraryStore(
      createStoragePersonalLibrary(() => storage),
      show,
    );

    store.getState().install([FIRST]);

    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "warn", title: MESSAGES.library.unavailable }),
    );
  });

  it("keeps installed nodes for the session when the library cannot persist", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const store = createPersonalLibraryStore(
      createStoragePersonalLibrary(() => storage),
      vi.fn(),
    );

    store.getState().install([FIRST, SECOND]);

    expect(store.getState().nodes).toEqual([FIRST, SECOND]);
  });
});
