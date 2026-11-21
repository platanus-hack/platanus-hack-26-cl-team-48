import { describe, expect, it } from "vitest";
import { diagnoseCodeError } from "./code-diagnostics.ts";

const TRACEBACK = [
  "Traceback (most recent call last):",
  '  File "<node>", line 4, in run',
  '  File "<code>", line 2, in transform',
  '  File "<code>", line 5, in helper',
  "KeyError: 'monto'",
].join("\n");

describe("diagnoseCodeError", () => {
  it("marks the deepest line of the user's code in a Python traceback", () => {
    expect(
      diagnoseCodeError({
        code: "PYTHON_EXCEPTION",
        message: "KeyError: 'monto'",
        detail: TRACEBACK,
      }),
    ).toEqual([{ line: 5, message: "KeyError: 'monto'" }]);
  });

  it("marks the line of a syntax error, which Python reports without a frame name", () => {
    const detail = '  File "<code>", line 3\n    def f(\n         ^\nSyntaxError: invalid syntax';

    expect(diagnoseCodeError({ code: "PYTHON_EXCEPTION", message: "SyntaxError", detail })).toEqual(
      [{ line: 3, message: "SyntaxError" }],
    );
  });

  it("marks nothing when the error is not in the user's code", () => {
    expect(diagnoseCodeError({ code: "SQL_ERROR", message: "x", detail: TRACEBACK })).toEqual([]);
    expect(
      diagnoseCodeError({
        code: "PYTHON_EXCEPTION",
        message: "x",
        detail: 'File "<node>", line 1',
      }),
    ).toEqual([]);
    expect(diagnoseCodeError(undefined)).toEqual([]);
  });
});
