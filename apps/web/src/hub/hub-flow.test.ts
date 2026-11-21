import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { CATALOG, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { withoutPrivateParams } from "./hub-flow.ts";

const LOCAL_FILE = manifestOf("core.source.file", {
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: {
      sourceId: { type: "string", "x-nodomics": { widget: "source" } },
      delimiter: { type: "string" },
    },
  },
});
const API = manifestOf("core.source.api", {
  category: "Fuentes",
  inputs: [],
  params: {
    type: "object",
    properties: {
      url: { type: "string" },
      headers: { type: "array", "x-nodomics": { widget: "key-values" } },
    },
  },
});

const catalog: ReadonlyArray<NodeManifest> = [...CATALOG, LOCAL_FILE, API];

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const fileNode = withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" });
const apiNode = withParams(nodeOf("api", API.id), {
  url: "https://example.com/ventas",
  headers: [
    { name: "Accept", value: "application/json" },
    { name: "Authorization", secret: "mi-token" },
    { name: "X-Both", value: "plain", secret: "otro-token" },
  ],
});
const filterNode = withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" });

const paramsOf = (flow: Flow, nodeId: string) => flow.nodes.find(({ id }) => id === nodeId)?.params;

describe("withoutPrivateParams", () => {
  it("removes params shown with the source widget", () => {
    const cleaned = withoutPrivateParams(flowOf([fileNode]), catalog);

    expect(paramsOf(cleaned, "file")).toEqual({ delimiter: ";" });
  });

  it("drops the stored credential of each key-value entry but keeps its name and plain value", () => {
    const cleaned = withoutPrivateParams(flowOf([apiNode]), catalog);

    expect(paramsOf(cleaned, "api")).toEqual({
      url: "https://example.com/ventas",
      headers: [
        { name: "Accept", value: "application/json" },
        { name: "Authorization" },
        { name: "X-Both", value: "plain" },
      ],
    });
  });

  it("keeps the params of nodes without private params unchanged", () => {
    const cleaned = withoutPrivateParams(flowOf([filterNode]), catalog);

    expect(paramsOf(cleaned, "f")).toEqual({ op: ">", value: "10" });
  });

  it("leaves nodes whose type is unknown unchanged", () => {
    const unknown = withParams(nodeOf("u", "vendor.unknown"), {
      sourceId: "src_1",
      headers: [{ name: "A", secret: "s" }],
    });

    const cleaned = withoutPrivateParams(flowOf([unknown]), catalog);

    expect(cleaned.nodes).toEqual([unknown]);
  });

  it("uses the flow's custom nodes as part of the catalog", () => {
    const custom = manifestOf("mine.lector", {
      params: {
        type: "object",
        properties: { archivo: { type: "string", "x-nodomics": { widget: "source" } } },
      },
    });
    const flow: Flow = {
      ...flowOf([withParams(nodeOf("m", custom.id), { archivo: "src_9", other: 1 })]),
      customNodes: [custom],
    };

    const cleaned = withoutPrivateParams(flow, catalog);

    expect(paramsOf(cleaned, "m")).toEqual({ other: 1 });
  });

  it("cleans the nodes inside custom nodes that are flows", () => {
    const custom = manifestOf("mine.ventas", {
      impl: { kind: "flow", graph: { nodes: [fileNode, apiNode, filterNode], edges: [] } },
    });
    const flow: Flow = { ...flowOf([nodeOf("m", custom.id)]), customNodes: [custom] };

    const cleaned = withoutPrivateParams(flow, catalog);

    const impl = cleaned.customNodes?.[0]?.impl;
    expect(
      impl?.kind === "flow" ? impl.graph.nodes.map(({ params }) => params) : undefined,
    ).toEqual([
      { delimiter: ";" },
      {
        url: "https://example.com/ventas",
        headers: [
          { name: "Accept", value: "application/json" },
          { name: "Authorization" },
          { name: "X-Both", value: "plain" },
        ],
      },
      { op: ">", value: "10" },
    ]);
  });

  it("keeps the rest of the flow as it is", () => {
    const flow: Flow = {
      ...flowOf(
        [
          { ...fileNode, position: { x: 10, y: 20 }, label: "Ventas" },
          { ...filterNode, position: { x: 300, y: 40 } },
        ],
        [edgeOf("file-f", ["file", "out"], ["f", "in"])],
      ),
      name: "Mi flujo",
    };

    const cleaned = withoutPrivateParams(flow, catalog);

    expect(cleaned).toEqual({
      ...flow,
      nodes: [{ ...flow.nodes[0], params: { delimiter: ";" } }, flow.nodes[1]],
    });
  });

  it("does not change the flow it receives", () => {
    const custom = manifestOf("mine.ventas", {
      impl: { kind: "flow", graph: { nodes: [fileNode, apiNode], edges: [] } },
    });
    const flow: Flow = { ...flowOf([fileNode, apiNode]), customNodes: [custom] };
    const before = structuredClone(flow);

    withoutPrivateParams(flow, catalog);

    expect(flow).toEqual(before);
  });
});
