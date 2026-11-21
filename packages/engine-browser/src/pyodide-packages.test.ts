import { expect, it } from "vitest";
import { PYODIDE_PACKAGES } from "./pyodide-packages.ts";

it("offers every package Pyodide can import before it loads, not only the preloaded ones", () => {
  expect(PYODIDE_PACKAGES).toEqual(expect.arrayContaining(["pandas", "pyarrow", "matplotlib"]));
});
