import { loadPyodide } from "pyodide";
import { expect, it } from "vitest";

const STARTUP_TIMEOUT_MS = 120_000;

it(
  "runs 1+1 in Pyodide under Node",
  async () => {
    const pyodide = await loadPyodide();

    expect(pyodide.runPython("1+1")).toBe(2);
  },
  STARTUP_TIMEOUT_MS,
);
