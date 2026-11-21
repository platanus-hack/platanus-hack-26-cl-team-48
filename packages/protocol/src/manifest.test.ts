import { describe, expect, it } from "vitest";
import { NodeManifest } from "./manifest.ts";
import { parse } from "./parse.ts";

const filterManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: { column: { type: "string", "x-nodomics": { widget: "column", of: "in" } } },
    required: ["column"],
  },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} WHERE {{ident column}} = {{lit value}}" },
};

describe("NodeManifest", () => {
  it("accepts a SQL node", () => {
    expect(parse(NodeManifest, filterManifest).ok).toBe(true);
  });

  it("accepts a Python node with its requirements", () => {
    const pythonManifest = {
      ...filterManifest,
      id: "core.python",
      impl: { kind: "python", code: "def run(inputs, params):\n    return inputs", entry: "run" },
      requires: { runtime: "python", packages: ["pandas"] },
    };

    expect(parse(NodeManifest, pythonManifest).ok).toBe(true);
  });

  it("accepts the builtin that defines a flow used as a node", () => {
    const entry = { ...filterManifest, impl: { kind: "builtin", name: "flow.node" } };

    expect(parse(NodeManifest, entry).ok).toBe(true);
  });

  it("rejects an unknown implementation kind", () => {
    expect(parse(NodeManifest, { ...filterManifest, impl: { kind: "typescript" } }).ok).toBe(false);
  });

  it("rejects a port with an unknown data type", () => {
    expect(
      parse(NodeManifest, { ...filterManifest, inputs: [{ id: "in", type: "matrix" }] }).ok,
    ).toBe(false);
  });

  it("rejects params that are not an object schema", () => {
    expect(parse(NodeManifest, { ...filterManifest, params: { type: "string" } }).ok).toBe(false);
  });
});
