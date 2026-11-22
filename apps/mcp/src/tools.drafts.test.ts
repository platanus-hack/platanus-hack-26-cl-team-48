import { describe, expect, it } from "vitest";
import { emptyFlow, revisionOf } from "./flow-edit/index.ts";
import {
  ALICE,
  PYTHON_CODE,
  SALES_FLOW,
  createHarness,
  readField,
  salesDocument,
} from "./tools.fixtures.ts";

const withSalesFlow = () =>
  createHarness({ flows: [{ userId: ALICE.userId, document: salesDocument() }] });

const codeNodeArgs = (draftId: string, code = PYTHON_CODE) => ({
  draftId,
  nodeId: "calc",
  language: "python",
  code,
  inputs: ["in"],
  outputs: ["out"],
});

describe("flows.create_draft", () => {
  it("returns the draft, its flow and the revision of the saved flow", async () => {
    const harness = withSalesFlow();

    const created = await harness.callOk("flows.create_draft", { flowId: "ventas" });

    expect(created).toMatchObject({
      flowId: "ventas",
      baseRevision: revisionOf(SALES_FLOW),
    });
    expect(typeof readField(created, "draftId")).toBe("string");
    expect(readField(created, "draftId")).not.toBe("");
  });

  it("starts the draft as a copy of the saved flow", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const flow = await harness.getFlow({ draftId });

    expect(flow).toEqual(SALES_FLOW);
  });

  it("creates an empty draft for a new flow when no flow id is given", async () => {
    const harness = withSalesFlow();
    const { draftId, flowId, baseRevision } = await harness.createDraft();

    const flow = await harness.getFlow({ draftId });

    expect(flowId).toMatch(/^flow_id-\d+$/);
    expect(baseRevision).toBe(revisionOf(emptyFlow()));
    expect(flow).toEqual(emptyFlow());
  });

  it("gives each new flow and draft its own id", async () => {
    const harness = withSalesFlow();

    const first = await harness.createDraft();
    const second = await harness.createDraft();

    expect(second.draftId).not.toBe(first.draftId);
    expect(second.flowId).not.toBe(first.flowId);
  });

  it("fails with the id of a flow that does not exist", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.create_draft", { flowId: "compras" });

    expect(message).toContain("compras");
  });
});

describe("draft operations", () => {
  it("adds a node and returns the new revision of the draft", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const result = await harness.callOk("flows.add_node", {
      draftId,
      type: "core.sort",
      nodeId: "orden",
    });

    const flow = await harness.getFlow({ draftId });
    expect(flow.nodes.at(-1)).toMatchObject({ id: "orden", type: "core.sort" });
    expect(result).toEqual({ revision: revisionOf(flow) });
  });

  it("leaves the saved flow untouched while editing the draft", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "orden" });

    expect(await harness.getFlow({ flowId: "ventas" })).toEqual(SALES_FLOW);
  });

  it("removes a node and its connections", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.remove_node", { draftId, nodeId: "top" });

    const flow = await harness.getFlow({ draftId });
    expect(flow.nodes.map((node) => node.id)).toEqual(["src"]);
    expect(flow.edges).toEqual([]);
  });

  it("connects two ports", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "orden" });

    await harness.callOk("flows.connect", { draftId, from: "top.out", to: "orden.in" });

    const flow = await harness.getFlow({ draftId });
    expect(flow.edges).toContainEqual(
      expect.objectContaining({
        from: { node: "top", port: "out" },
        to: { node: "orden", port: "in" },
      }),
    );
  });

  it("disconnects two ports", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.disconnect", { draftId, from: "src.out", to: "top.in" });

    expect((await harness.getFlow({ draftId })).edges).toEqual([]);
  });

  it("sets a parameter of a node", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.set_param", { draftId, nodeId: "top", name: "n", value: 25 });

    const flow = await harness.getFlow({ draftId });
    expect(flow.nodes.find((node) => node.id === "top")?.params["n"]).toBe(25);
  });

  it("creates a code node with its manifest", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.create_code_node", codeNodeArgs(draftId));

    const flow = await harness.getFlow({ draftId });
    expect(flow.nodes.at(-1)).toMatchObject({ id: "calc", type: "code.calc" });
    expect(flow.customNodes?.map((manifest) => manifest.id)).toEqual(["code.calc"]);
  });

  it("updates the code of a code node", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.create_code_node", codeNodeArgs(draftId));
    const newCode = 'def run(inputs, params):\n    return {"out": inputs["in"].head(5)}\n';

    await harness.callOk("flows.update_code_node", codeNodeArgs(draftId, newCode));

    const flow = await harness.getFlow({ draftId });
    expect(flow.customNodes?.[0]?.impl).toMatchObject({ kind: "python", code: newCode });
  });

  it("fails without changing the draft when an operation is invalid", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const message = await harness.callError("flows.add_node", {
      draftId,
      type: "core.unknown",
      nodeId: "x",
    });

    expect(message).not.toBe("");
    expect(await harness.getFlow({ draftId })).toEqual(SALES_FLOW);
  });

  it("fails with the id of a draft that does not exist", async () => {
    const harness = withSalesFlow();

    const message = await harness.callError("flows.add_node", {
      draftId: "draft-missing",
      type: "core.sort",
      nodeId: "orden",
    });

    expect(message).toContain("draft-missing");
  });
});

describe("flows.batch", () => {
  it("applies every operation and reports how many were applied", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const result = await harness.callOk("flows.batch", {
      draftId,
      ops: [
        { op: "add_node", args: { type: "core.sort", nodeId: "orden" } },
        { op: "connect", args: { from: "top.out", to: "orden.in" } },
        { op: "set_param", args: { nodeId: "orden", name: "column", value: "mes" } },
      ],
    });

    const flow = await harness.getFlow({ draftId });
    expect(result).toEqual({ revision: revisionOf(flow), applied: 3 });
    expect(flow.nodes.find((node) => node.id === "orden")?.params["column"]).toBe("mes");
  });

  it("changes nothing when one operation fails", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const message = await harness.callError("flows.batch", {
      draftId,
      ops: [
        { op: "add_node", args: { type: "core.sort", nodeId: "orden" } },
        { op: "connect", args: { from: "orden.out", to: "missing.in" } },
      ],
    });

    expect(message).not.toBe("");
    expect(await harness.getFlow({ draftId })).toEqual(SALES_FLOW);
  });
});

describe("flows.declare_as_node", () => {
  it("is not available yet", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const message = await harness.callError("flows.declare_as_node", {
      draftId,
      name: "Top ventas",
      inputs: [],
      params: [],
    });

    expect(message).toBe("flows.declare_as_node is not available yet");
  });
});

describe("flows.discard", () => {
  it("confirms the discarded draft", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    const result = await harness.callOk("flows.discard", { draftId });

    expect(result).toEqual({ discarded: draftId });
  });

  it("makes the draft unreachable afterwards", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");

    await harness.callOk("flows.discard", { draftId });

    expect(await harness.callError("flows.get", { draftId })).toContain(draftId);
  });

  it("keeps the saved flow", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "orden" });

    await harness.callOk("flows.discard", { draftId });

    expect(readField(await harness.readDocument("ventas"), "flow")).toEqual(SALES_FLOW);
  });
});
