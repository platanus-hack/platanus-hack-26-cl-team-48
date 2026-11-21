import type { Flow, FlowNode, NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { CATALOG, edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { nodeFromFlow } from "../library/flow-node.ts";
import { withoutPrivateParams } from "./hub-flow.ts";
import { publicationContent } from "./publication-content.ts";

const ENTRY = manifestOf("flow.node", {
  category: "Flujo",
  inputs: [],
  outputs: [],
  params: {
    type: "object",
    properties: {
      name: { type: "string" },
      inputs: { type: "array", "x-nodomics": { widget: "ports" } },
      params: { type: "array", "x-nodomics": { widget: "node-params" } },
    },
  },
  impl: { kind: "builtin", name: "flow.node" },
});
const OUTPUT = manifestOf("flow.output", {
  category: "Flujo",
  inputs: [{ id: "in", type: "any" }],
  outputs: [],
  impl: { kind: "builtin", name: "flow.output" },
});
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
const ENRICH = manifestOf("core.enrich.api", {
  params: {
    type: "object",
    properties: { headers: { type: "array", "x-nodomics": { widget: "key-values" } } },
  },
});

const catalog: ReadonlyArray<NodeManifest> = [...CATALOG, ENTRY, OUTPUT, LOCAL_FILE, ENRICH];

const withParams = (node: FlowNode, params: FlowNode["params"]): FlowNode => ({ ...node, params });

const ENTRY_PARAMS = {
  name: "Ventas altas",
  description: "Filtra las ventas grandes.",
  inputs: [{ name: "Ventas", type: "table" }],
  params: [{ id: "minimo", title: "Mínimo", node: "f", param: "value" }],
};

const fileNode = withParams(nodeOf("file", LOCAL_FILE.id), { sourceId: "src_42", delimiter: ";" });

/** file(test data) → entry(ventas) → filter f → enrich k → output "Resultado". */
const nodeFlow = (entryParams: FlowNode["params"] = ENTRY_PARAMS): Flow =>
  flowOf(
    [
      fileNode,
      withParams(nodeOf("e", "flow.node"), entryParams),
      withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" }),
      withParams(nodeOf("k", ENRICH.id), {
        headers: [{ name: "Authorization", value: "Bearer", secret: "mi-token" }],
      }),
      withParams(nodeOf("o", "flow.output"), { name: "Resultado" }),
    ],
    [
      edgeOf("file-e", ["file", "out"], ["e", "ventas"]),
      edgeOf("e-f", ["e", "ventas"], ["f", "in"]),
      edgeOf("f-k", ["f", "out"], ["k", "in"]),
      edgeOf("k-o", ["k", "out"], ["o", "in"]),
    ],
  );

const plainFlow: Flow = flowOf(
  [fileNode, withParams(nodeOf("f", "core.filter"), { op: ">", value: "10" })],
  [edgeOf("file-f", ["file", "out"], ["f", "in"])],
);

const TARGET = { handle: "ana", slug: "ventas-altas", version: "1.2.0" };

const contentOf = (flow: Flow) => publicationContent({ flowId: "f1", flow, catalog }, TARGET);

describe("publicationContent", () => {
  it("publishes a flow without a node entry as a flow, without a manifest", () => {
    const content = contentOf(plainFlow);

    expect(content).toEqual({
      ok: true,
      value: { kind: "flow", flow: withoutPrivateParams(plainFlow, catalog) },
    });
  });

  it("publishes the flow without its private params", () => {
    const content = contentOf(plainFlow);

    expect(content.ok && content.value.flow.nodes[0]?.params).toEqual({ delimiter: ";" });
  });

  it("publishes a flow with a node entry as a node", () => {
    const content = contentOf(nodeFlow());

    expect(content.ok && content.value.kind).toBe("node");
  });

  it("publishes the cleaned flow alongside the node", () => {
    const content = contentOf(nodeFlow());

    expect(content.ok && content.value.flow).toEqual(withoutPrivateParams(nodeFlow(), catalog));
  });

  it("names the node's manifest after the hub handle and slug, with the target version", () => {
    const built = nodeFromFlow(
      { id: "f1", version: TARGET.version, flow: withoutPrivateParams(nodeFlow(), catalog) },
      catalog,
    );

    const content = contentOf(nodeFlow());

    expect(built.ok).toBe(true);
    expect(content.ok && content.value.manifest).toEqual(
      built.ok ? { ...built.value, id: "hub.ana.ventas-altas", version: "1.2.0" } : undefined,
    );
  });

  it("keeps stored credentials out of the node's inner flow", () => {
    const content = contentOf(nodeFlow());

    const impl = content.ok ? content.value.manifest?.impl : undefined;
    expect(
      impl?.kind === "flow" ? impl.graph.nodes.find(({ id }) => id === "k")?.params : undefined,
    ).toEqual({ headers: [{ name: "Authorization", value: "Bearer" }] });
  });

  it.each([
    ["no-name", nodeFlow({ ...ENTRY_PARAMS, name: "  " })],
    ["no-outputs", flowOf([withParams(nodeOf("e", "flow.node"), ENTRY_PARAMS)])],
  ])("refuses a node that cannot be built because of %s", (issue, flow) => {
    const content = contentOf(flow);

    expect(content).toEqual({ ok: false, error: issue });
  });
});
