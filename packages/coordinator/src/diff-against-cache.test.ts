import { describe, expect, it } from "vitest";
import { diffAgainstCache } from "./diff-against-cache.ts";

describe("diffAgainstCache", () => {
  it("splits nodes into those with a cached result and those that must run", () => {
    const keys = new Map([
      ["a", "k1"],
      ["b", "k2"],
      ["c", "k3"],
    ]);

    const diff = diffAgainstCache(keys, new Set(["k1", "k3"]));

    expect(diff).toEqual({ stale: ["b"], cached: ["a", "c"] });
  });
});
