import { describe, expect, it } from "vitest";
import { createResultStore } from "./result-store.ts";

const ref = (id: string) => ({ id, rowCount: 1, schema: [] });

describe("result store replacement", () => {
  it("releases replaced outputs and their imported copies", () => {
    const store = createResultStore();
    store.put("key", { executor: 0, outputs: { out: ref("old") }, displays: [] });
    store.putCopy("old", { executor: 1, ref: ref("copy") });

    expect(store.put("key", { executor: 0, outputs: { out: ref("new") }, displays: [] })).toEqual(
      new Map([
        [0, ["old"]],
        [1, ["copy"]],
      ]),
    );
    expect(store.locate("old")).toBeUndefined();
    expect(store.locate("copy")).toBeUndefined();
    expect(store.locate("new")).toBe(0);
  });

  it("keeps outputs reused by a replacement", () => {
    const store = createResultStore();
    store.put("key", { executor: 0, outputs: { out: ref("same") }, displays: [] });

    expect(store.put("key", { executor: 0, outputs: { out: ref("same") }, displays: [] })).toEqual(
      new Map(),
    );
    expect(store.locate("same")).toBe(0);
  });
});

describe("result store figures", () => {
  const figure = (id: string) => ({ id, mime: "image/png" as const, width: 1, height: 1 });

  it("locates a node's figures and releases them with its outputs", () => {
    const store = createResultStore();
    store.put("key", { executor: 1, outputs: { out: ref("r") }, displays: [figure("d")] });

    expect(store.locate("d")).toBe(1);
    expect(store.evictExcept(new Set())).toEqual(new Map([[1, ["r", "d"]]]));
    expect(store.locate("d")).toBeUndefined();
  });

  it("releases the figures of a replaced entry", () => {
    const store = createResultStore();
    store.put("key", { executor: 1, outputs: {}, displays: [figure("old")] });

    expect(store.put("key", { executor: 1, outputs: {}, displays: [figure("new")] })).toEqual(
      new Map([[1, ["old"]]]),
    );
  });
});
