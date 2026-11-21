import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "./testing/connect-test-client.ts";

const customNode: NodeManifest = {
  id: "custom.top10",
  version: "1.0.0",
  name: "Top 10",
  category: "Mis nodos",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: {} },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} LIMIT 10" },
};

describe("nodes.list", () => {
  it("lists the fixed catalog of valid manifests", async () => {
    const client = connectTestClient();

    const { nodes } = await client.request("nodes.list", {});

    expect(nodes.map((node) => node.id)).toEqual([
      "core.source.csv",
      "core.filter",
      "core.group",
      "core.python.zscore",
      "core.view.bar",
      "flow.input",
      "flow.output",
    ]);
  });

  it.each([
    {
      id: "flow.input",
      version: "0.1.0",
      name: "Entrada",
      description: "Entrada de un flujo usado como nodo.",
      category: "Flujo",
      inputs: [],
      outputs: [{ id: "out", type: "any" }],
      params: {
        type: "object",
        properties: { name: { title: "Nombre", type: "string", default: "in" } },
      },
      impl: { kind: "builtin", name: "flow.input" },
    },
    {
      id: "flow.output",
      version: "0.1.0",
      name: "Salida",
      description: "Salida de un flujo usado como nodo.",
      category: "Flujo",
      inputs: [{ id: "in", type: "any" }],
      outputs: [],
      params: {
        type: "object",
        properties: { name: { title: "Nombre", type: "string", default: "out" } },
      },
      impl: { kind: "builtin", name: "flow.output" },
    },
  ])("lists $id exactly as defined in nodes-core", async (manifest) => {
    const client = connectTestClient();

    const { nodes } = await client.request("nodes.list", {});

    expect(nodes.find((node) => node.id === manifest.id)).toEqual(manifest);
  });

  it("offers a CSV source that reads the chosen source with a source widget", async () => {
    const client = connectTestClient();

    const { nodes } = await client.request("nodes.list", {});

    expect(nodes.find((node) => node.id === "core.source.csv")).toMatchObject({
      impl: { kind: "sql", template: "SELECT * FROM {{source sourceId}}" },
      params: {
        properties: { sourceId: { "x-nodomics": { widget: "source" } } },
        required: ["sourceId"],
      },
    });
  });

  it("describes each node with the implementation kind it needs", async () => {
    const client = connectTestClient();

    const { nodes } = await client.request("nodes.list", {});

    expect(Object.fromEntries(nodes.map((node) => [node.id, node.impl.kind]))).toEqual({
      "core.source.csv": "sql",
      "core.filter": "sql",
      "core.group": "sql",
      "core.python.zscore": "python",
      "core.view.bar": "view",
      "flow.input": "builtin",
      "flow.output": "builtin",
    });
  });
});

describe("nodes.register", () => {
  it("adds custom nodes to the session catalog", async () => {
    const client = connectTestClient();

    await client.request("nodes.register", { nodes: [customNode] });
    const { nodes } = await client.request("nodes.list", {});

    expect(nodes).toContainEqual(customNode);
  });

  it("keeps the catalog of other sessions untouched", async () => {
    await connectTestClient().request("nodes.register", { nodes: [customNode] });

    const { nodes } = await connectTestClient().request("nodes.list", {});

    expect(nodes.map((node) => node.id)).not.toContain(customNode.id);
  });
});

describe("source.add", () => {
  it("returns the same source id every time", async () => {
    const client = connectTestClient();

    const first = await client.request("source.add", {
      kind: "upload",
      name: "ventas.csv",
      file: "…",
    });
    const second = await client.request("source.add", { kind: "url", url: "https://x.test/v.csv" });

    expect(first.sourceId).toBe(second.sourceId);
  });

  it("names the source after the uploaded file", async () => {
    const client = connectTestClient();

    const source = await client.request("source.add", {
      kind: "upload",
      name: "ventas.csv",
      file: "…",
    });

    expect(source.name).toBe("ventas.csv");
  });
});
