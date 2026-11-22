import { coreNodes } from "@nodomics/nodes-core";
import { describe, expect, it } from "vitest";
import { describeManifest, emptyFlow, validateFlow } from "./flow-edit/index.ts";
import { ALICE, SALES_FLOW, createHarness, salesDocument } from "./tools.fixtures.ts";

const TOOL_NAMES = [
  "nodes.list",
  "nodes.get_manifest",
  "flows.get",
  "flows.search",
  "flows.validate",
  "flows.create_draft",
  "flows.add_node",
  "flows.remove_node",
  "flows.connect",
  "flows.disconnect",
  "flows.set_param",
  "flows.create_code_node",
  "flows.update_code_node",
  "flows.batch",
  "flows.declare_as_node",
  "flows.diff",
  "flows.apply",
  "flows.discard",
  "run.flow",
  "run.sample",
  "run.logs",
];

const withSalesFlow = () =>
  createHarness({ flows: [{ userId: ALICE.userId, document: salesDocument() }] });

describe("tool list", () => {
  it("exposes exactly the tools the agent is allowed to call", () => {
    const { tools } = createHarness();

    const names = tools.list().map((tool) => tool.name);

    expect([...names].sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("describes every tool with text and an object input schema", () => {
    const { tools } = createHarness();

    const descriptors = tools.list();

    for (const descriptor of descriptors) {
      expect(descriptor.description, descriptor.name).not.toBe("");
      expect(descriptor.inputSchema["type"], descriptor.name).toBe("object");
    }
  });
});

describe("nodes.list", () => {
  it("lists the type and title of every catalog node", async () => {
    const harness = createHarness();

    const nodes = await harness.callOk("nodes.list", {});

    expect(nodes).toEqual(
      coreNodes.map((manifest) => ({ type: manifest.id, title: manifest.name })),
    );
  });
});

describe("nodes.get_manifest", () => {
  it("describes the manifest of a catalog node", async () => {
    const harness = createHarness();
    const filter = coreNodes.find((manifest) => manifest.id === "core.filter");

    const summary = await harness.callOk("nodes.get_manifest", { type: "core.filter" });

    expect(filter).toBeDefined();
    expect(summary).toEqual(filter && describeManifest(filter));
  });

  it("fails with the name of an unknown node type", async () => {
    const harness = createHarness();

    const message = await harness.callError("nodes.get_manifest", { type: "core.unknown" });

    expect(message).toContain("core.unknown");
  });
});

describe("flows.get", () => {
  it("returns the saved flow of a flow id", async () => {
    const harness = withSalesFlow();

    const flow = await harness.callOk("flows.get", { flowId: "ventas" });

    expect(flow).toEqual(SALES_FLOW);
  });

  it("returns the flow of a draft id", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "orden" });

    const flow = await harness.getFlow({ draftId });

    expect(flow.nodes.map((node) => node.id)).toEqual(["src", "top", "orden"]);
  });

  it("prefers the draft id when both ids are given", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft();

    const flow = await harness.callOk("flows.get", { draftId, flowId: "ventas" });

    expect(flow).toEqual(emptyFlow());
  });

  it("fails asking for a reference when neither id is given", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.get", {});

    expect(message).toBe("Provide draftId or flowId");
  });

  it("fails with the id of a flow that does not exist", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.get", { flowId: "compras" });

    expect(message).toContain("compras");
  });

  it("fails with the id of a draft that does not exist", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.get", { draftId: "draft-missing" });

    expect(message).toContain("draft-missing");
  });
});

describe("flows.search", () => {
  const withTwoFlows = () =>
    createHarness({
      flows: [
        { userId: ALICE.userId, document: salesDocument() },
        {
          userId: ALICE.userId,
          document: { ...salesDocument(), id: "inventario", name: "Stock de bodega" },
        },
      ],
    });

  it("finds flows whose id contains the query, ignoring case", async () => {
    const harness = withTwoFlows();

    const ids = await harness.callOk("flows.search", { query: "VENTAS" });

    expect(ids).toEqual(["ventas"]);
  });

  it("finds flows whose name contains the query, ignoring case", async () => {
    const harness = withTwoFlows();

    const ids = await harness.callOk("flows.search", { query: "bodega" });

    expect(ids).toEqual(["inventario"]);
  });

  it("returns every flow for an empty query", async () => {
    const harness = withTwoFlows();

    const ids = await harness.callOk("flows.search", { query: "" });

    expect(ids).toEqual(expect.arrayContaining(["inventario", "ventas"]));
    expect(ids).toHaveLength(2);
  });

  it("returns an empty list when nothing matches", async () => {
    const harness = withTwoFlows();

    const ids = await harness.callOk("flows.search", { query: "clientes" });

    expect(ids).toEqual([]);
  });
});

describe("flows.validate", () => {
  it("reports a correct saved flow as valid", async () => {
    const harness = withSalesFlow();

    const validation = await harness.callOk("flows.validate", { flowId: "ventas" });

    expect(validation).toEqual({ valid: true, issues: [] });
  });

  it("reports the issues of a draft", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "orden" });
    const draftFlow = await harness.getFlow({ draftId });

    const validation = await harness.callOk("flows.validate", { draftId });

    expect(validation).toMatchObject({ valid: false });
    expect(validation).toEqual(validateFlow(draftFlow, coreNodes));
  });

  it("fails asking for a reference when neither id is given", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.validate", {});

    expect(message).toBe("Provide draftId or flowId");
  });
});
