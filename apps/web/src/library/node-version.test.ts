import { describe, expect, it } from "vitest";
import { manifestOf } from "../canvas/canvas-fixtures.ts";
import { nextNodeVersion } from "./node-version.ts";

const node = manifestOf("mine.f1", { version: "0.1.4" });

describe("nextNodeVersion", () => {
  it("starts a node that was never saved at 0.1.0", () => {
    expect(nextNodeVersion(undefined, node)).toEqual({
      version: "0.1.0",
      fingerprint: expect.any(String) as unknown,
    });
  });

  it("keeps the version while the node stays the same, whatever its key order", () => {
    const saved = nextNodeVersion(undefined, node);
    const reordered = {
      ...node,
      version: "9.9.9",
      params: { properties: {}, type: "object" as const },
    };

    expect(nextNodeVersion(saved, reordered)).toEqual(saved);
  });

  it("raises the patch version when the node changes", () => {
    const saved = { version: "0.1.4", fingerprint: nextNodeVersion(undefined, node).fingerprint };

    expect(nextNodeVersion(saved, { ...node, name: "Otro" }).version).toBe("0.1.5");
  });
});
