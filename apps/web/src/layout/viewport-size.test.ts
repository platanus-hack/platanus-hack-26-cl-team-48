import { expect, it } from "vitest";
import { viewportSizeOf } from "./viewport-size.ts";

it.each([
  [1440, "wide"],
  [1100, "wide"],
  [1099, "medium"],
  [820, "medium"],
  [819, "narrow"],
  [600, "narrow"],
  [599, "phone"],
])("classifies a %i px wide window as %s, with the breakpoints of the design", (width, size) => {
  expect(viewportSizeOf(width)).toBe(size);
});
