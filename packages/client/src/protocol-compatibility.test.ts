import { describe, expect, it } from "vitest";
import { isCompatibleProtocol } from "./protocol-compatibility.ts";

describe("isCompatibleProtocol", () => {
  it.each([
    ["0.1", "0.1.7", true],
    ["0.1", "0.2", false],
    ["0.1", "1.1", false],
    ["1.0", "1.4", true],
    ["1.2", "2.2", false],
  ])("compares %s with %s as %s", (expected, received, isCompatible) => {
    expect(isCompatibleProtocol(expected, received)).toBe(isCompatible);
  });
});
