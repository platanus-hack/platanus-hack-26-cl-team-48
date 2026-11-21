import { describe, expect, it } from "vitest";
import { toCodePosition, toCompletionOption } from "./engine-completions.ts";

describe("toCodePosition", () => {
  it("counts lines from 1 and columns from 0, as engines expect", () => {
    expect(toCodePosition("import pandas as pd\npd.read", 27)).toEqual({ line: 2, column: 7 });
    expect(toCodePosition("x", 0)).toEqual({ line: 1, column: 0 });
  });
});

describe("toCompletionOption", () => {
  it("shows each engine completion with the editor's icon for its kind", () => {
    expect(
      toCompletionOption({ label: "pandas", kind: "module", detail: "module pandas" }),
    ).toEqual({
      label: "pandas",
      type: "namespace",
      detail: "module pandas",
    });
    expect(toCompletionOption({ label: "x", kind: "other" })).toEqual({ label: "x", type: "text" });
  });
});
