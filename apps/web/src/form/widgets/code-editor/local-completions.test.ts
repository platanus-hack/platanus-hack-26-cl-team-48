import { describe, expect, it } from "vitest";
import { completeLocally, toModuleNames } from "./local-completions.ts";

const environment = {
  inputs: [
    {
      alias: "in",
      columns: [
        { name: "region", type: "text" as const },
        { name: "monto total", type: "number" as const },
      ],
    },
  ],
  modules: ["pandas", "matplotlib", "scikit_learn"],
};

describe("completeLocally", () => {
  it("offers the environment's modules after import and from", () => {
    const completion = completeLocally("import pa", environment);

    expect(completion?.from).toBe(7);
    expect(completion?.options).toContainEqual({ label: "pandas", type: "namespace" });
    expect(completeLocally("from mat", environment)?.from).toBe(5);
  });

  it("offers the node's inputs inside inputs[...]", () => {
    expect(completeLocally('    table = inputs["', environment)).toEqual({
      from: 20,
      options: [{ label: "in", type: "variable", detail: "entrada" }],
    });
  });

  it("offers the columns of an input inside its brackets, with their type", () => {
    expect(completeLocally('inputs["in"]["mo', environment)).toEqual({
      from: 14,
      options: [
        { label: "region", type: "property", detail: "texto" },
        { label: "monto total", type: "property", detail: "número" },
      ],
    });
  });

  it("leaves everything else to the language and the engine", () => {
    expect(completeLocally("x = pd.", environment)).toBeUndefined();
  });
});

describe("toModuleNames", () => {
  it("turns package names into the names code imports", () => {
    expect(toModuleNames(["scikit-learn", "PyYAML", "pandas", "pandas"])).toEqual([
      "pandas",
      "pyyaml",
      "scikit_learn",
    ]);
  });
});
