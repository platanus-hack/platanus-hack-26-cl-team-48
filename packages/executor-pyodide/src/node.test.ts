import { describe, expect, it } from "vitest";
import { loadPyodide } from "./node.ts";

describe("Node Python entry point", () => {
  it("loads Pyodide and evaluates Python under Node", async () => {
    const python = await loadPyodide();

    expect(python.runPython("1 + 1")).toBe(2);
  }, 120_000);
});
