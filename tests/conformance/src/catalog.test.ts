import { expect, it } from "vitest";
import { readCases } from "./read-cases.ts";

it("reads all official cases and parses their tables", () => {
  const cases = readCases();
  expect(cases.length).toBeGreaterThan(15);
  expect(cases.some(({ manifest }) => manifest.id === "core.source.csv")).toBe(true);
  expect(cases.some(({ manifest }) => manifest.id === "core.view.bar")).toBe(true);
});
