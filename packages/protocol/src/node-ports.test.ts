import { describe, expect, it } from "vitest";
import type { NodeManifest } from "./manifest.ts";
import { nodePorts, portIdOf } from "./node-ports.ts";

const ENTRY: NodeManifest = {
  id: "flow.node",
  version: "0.1.0",
  name: "Entrada de nodo",
  category: "Flujo",
  inputs: [],
  outputs: [],
  params: {
    type: "object",
    properties: {
      name: { type: "string" },
      inputs: { type: "array", "x-nodomics": { widget: "ports" } },
    },
  },
  impl: { kind: "builtin", name: "flow.node" },
};

describe("portIdOf", () => {
  it.each([
    ["ventas", "ventas"],
    ["Ventas 2024", "ventas_2024"],
    ["Año fiscal", "ano_fiscal"],
    ["  ¿Umbral?  ", "umbral"],
  ])("turns %j into the port id %j", (name, id) => {
    expect(portIdOf(name)).toBe(id);
  });
});

describe("nodePorts", () => {
  it("keeps the manifest's ports for a node without declared ports", () => {
    const manifest: NodeManifest = { ...ENTRY, inputs: [{ id: "in", type: "table" }] };

    expect(nodePorts(manifest, {})).toEqual({ inputs: manifest.inputs, outputs: [] });
  });

  it("turns each declared port into an output and an input of the same id", () => {
    const ports = nodePorts(ENTRY, {
      inputs: [
        { name: "Ventas", type: "table" },
        { name: "Umbral", type: "value" },
      ],
    });

    const expected = [
      { id: "ventas", name: "Ventas", type: "table" },
      { id: "umbral", name: "Umbral", type: "value" },
    ];
    expect(ports).toEqual({ inputs: expected, outputs: expected });
  });

  it("ignores declared ports without a name, with an unknown type or repeated", () => {
    const ports = nodePorts(ENTRY, {
      inputs: [
        { name: "", type: "table" },
        { name: "a", type: "matrix" },
        { name: "b", type: "table" },
        { name: "B", type: "value" },
        "c",
      ],
    });

    expect(ports.outputs).toEqual([{ id: "b", name: "b", type: "table" }]);
  });
});
