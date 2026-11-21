import { expect, it } from "vitest";
import { navigateTabs } from "./tab-navigation.ts";

it.each([
  [0, "ArrowRight", 1],
  [2, "ArrowRight", 0],
  [0, "ArrowLeft", 2],
  [2, "ArrowLeft", 1],
  [1, "Home", undefined],
])("navigates from %s with %s to %s", (index, key, expected) => {
  expect(navigateTabs({ index, key, count: 3 })).toBe(expected);
});

it("does not navigate an empty tab list", () => {
  expect(navigateTabs({ index: 0, key: "ArrowRight", count: 0 })).toBeUndefined();
});
