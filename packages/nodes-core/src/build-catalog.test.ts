import { describe, expect, it } from "vitest";
import { buildCatalog } from "./build-catalog.ts";

const sqlNode = {
  id: "core.limit",
  version: "0.1.0",
  name: "Limitar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: { n: { type: "integer" } } },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} LIMIT {{lit n}}" },
};

const pythonNode = {
  ...sqlNode,
  id: "core.python.echo",
  name: "Eco",
  impl: { kind: "python", entry: "run" },
};

const PYTHON_CODE = "def run(inputs, params):\n    return {'out': inputs['in']}\n";

describe("buildCatalog", () => {
  it("returns the manifests read from each node folder", () => {
    const result = buildCatalog([{ name: "core.limit", nodeJson: JSON.stringify(sqlNode) }]);

    expect(result).toEqual({ ok: true, value: [sqlNode] });
  });

  it("embeds main.py as the code of a Python node", () => {
    const result = buildCatalog([
      { name: "core.python.echo", nodeJson: JSON.stringify(pythonNode), mainPy: PYTHON_CODE },
    ]);

    expect(result).toEqual({
      ok: true,
      value: [{ ...pythonNode, impl: { kind: "python", entry: "run", code: PYTHON_CODE } }],
    });
  });

  it("sorts the manifests by id", () => {
    const result = buildCatalog([
      { name: "core.python.echo", nodeJson: JSON.stringify(pythonNode), mainPy: PYTHON_CODE },
      { name: "core.limit", nodeJson: JSON.stringify(sqlNode) },
    ]);

    expect(result.ok && result.value.map((manifest) => manifest.id)).toEqual([
      "core.limit",
      "core.python.echo",
    ]);
  });

  it("reports a node.json that is not valid JSON", () => {
    const result = buildCatalog([{ name: "core.limit", nodeJson: "{" }]);

    expect(result.ok).toBe(false);
  });

  it("reports a manifest that does not match the schema", () => {
    const result = buildCatalog([
      { name: "core.limit", nodeJson: JSON.stringify({ ...sqlNode, impl: { kind: "ts" } }) },
    ]);

    expect(result.ok).toBe(false);
  });

  it("reports a folder whose name differs from the node id", () => {
    const result = buildCatalog([{ name: "limit", nodeJson: JSON.stringify(sqlNode) }]);

    expect(result).toEqual({
      ok: false,
      error: [{ node: "limit", message: 'the folder name must equal the node id "core.limit"' }],
    });
  });

  it("reports a Python node without main.py", () => {
    const result = buildCatalog([
      { name: "core.python.echo", nodeJson: JSON.stringify(pythonNode) },
    ]);

    expect(result).toEqual({
      ok: false,
      error: [{ node: "core.python.echo", message: "a Python node needs a main.py" }],
    });
  });

  it("reports Python code written inside node.json", () => {
    const inlineCode = { ...pythonNode, impl: { ...pythonNode.impl, code: PYTHON_CODE } };

    const result = buildCatalog([
      { name: "core.python.echo", nodeJson: JSON.stringify(inlineCode), mainPy: PYTHON_CODE },
    ]);

    expect(result).toEqual({
      ok: false,
      error: [{ node: "core.python.echo", message: "impl.code belongs in main.py, not node.json" }],
    });
  });

  it("reports a main.py next to a node that is not Python", () => {
    const result = buildCatalog([
      { name: "core.limit", nodeJson: JSON.stringify(sqlNode), mainPy: PYTHON_CODE },
    ]);

    expect(result).toEqual({
      ok: false,
      error: [{ node: "core.limit", message: "only Python nodes have a main.py" }],
    });
  });
});
