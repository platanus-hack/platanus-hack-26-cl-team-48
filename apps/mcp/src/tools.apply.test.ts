import { describe, expect, it } from "vitest";
import { emptyFlow, revisionOf } from "./flow-edit/index.ts";
import {
  ALICE,
  BOB,
  NOW,
  SALES_FLOW,
  createHarness,
  readField,
  salesDocument,
} from "./tools.fixtures.ts";

const withSalesFlow = () =>
  createHarness({ flows: [{ userId: ALICE.userId, document: salesDocument() }] });

async function changedDraft() {
  const harness = withSalesFlow();
  const ref = await harness.createDraft("ventas");
  await harness.callOk("flows.set_param", {
    draftId: ref.draftId,
    nodeId: "top",
    name: "n",
    value: 25,
  });
  return { harness, ...ref };
}

describe("draft diff and apply", () => {
  it("reports a draft change with its base revision", async () => {
    const { harness, draftId, baseRevision } = await changedDraft();

    const diff = await harness.callOk("flows.diff", { draftId });

    expect(diff).toEqual({
      baseRevision,
      stale: false,
      changes: [
        { id: "set_param:top.n", kind: "set_param", target: "top.n", before: 10, after: 25 },
      ],
    });
  });

  it("applies all changes while preserving document metadata", async () => {
    const { harness, draftId, baseRevision } = await changedDraft();
    const expected = await harness.getFlow({ draftId });

    const result = await harness.callOk("flows.apply", { draftId, baseRevision });

    expect(result).toEqual({
      flowId: "ventas",
      revision: revisionOf(expected),
      applied: ["set_param:top.n"],
    });
    expect(await harness.readDocument("ventas")).toEqual({
      ...salesDocument(),
      flow: expected,
      updatedAt: NOW,
    });
    expect(await harness.callError("flows.get", { draftId })).toContain(draftId);
  });

  it("applies only the selected changes", async () => {
    const { harness, draftId } = await changedDraft();
    await harness.callOk("flows.add_node", { draftId, type: "core.sort", nodeId: "sort" });

    await harness.callOk("flows.apply", { draftId, changeIds: ["set_param:top.n"] });

    const saved = await harness.getFlow({ flowId: "ventas" });
    expect(saved.nodes.map(({ id }) => id)).toEqual(["src", "top"]);
    expect(saved.nodes.find(({ id }) => id === "top")?.params["n"]).toBe(25);
  });

  it("rejects an unknown change without deleting the draft or changing the flow", async () => {
    const { harness, draftId } = await changedDraft();

    const error = await harness.callError("flows.apply", { draftId, changeIds: ["unknown"] });

    expect(error).toContain("unknown");
    expect(await harness.getFlow({ flowId: "ventas" })).toEqual(SALES_FLOW);
    expect(await harness.getFlow({ draftId })).not.toEqual(SALES_FLOW);
  });

  it("marks the diff stale when the saved flow changes", async () => {
    const { harness, draftId } = await changedDraft();
    await harness.storesFor(ALICE).flows.write(salesDocument({ ...SALES_FLOW, name: "New name" }));

    const diff = await harness.callOk("flows.diff", { draftId });

    expect(readField(diff, "stale")).toBe(true);
  });

  it("rejects a stale apply and preserves the saved flow and draft", async () => {
    const { harness, draftId } = await changedDraft();
    const changed = { ...SALES_FLOW, name: "Changed elsewhere" };
    await harness.storesFor(ALICE).flows.write(salesDocument(changed));

    expect(await harness.callError("flows.apply", { draftId })).not.toBe("");
    expect(await harness.getFlow({ flowId: "ventas" })).toEqual(changed);
    expect(await harness.getFlow({ draftId })).toBeDefined();
  });

  it("stores a new flow when applying a new draft", async () => {
    const harness = createHarness();
    const { draftId, flowId } = await harness.createDraft();

    const result = await harness.callOk("flows.apply", { draftId });

    expect(result).toEqual({ flowId, revision: revisionOf(emptyFlow()), applied: [] });
    expect(await harness.readDocument(flowId)).toEqual({
      id: flowId,
      name: "Flujo del agente",
      flow: emptyFlow(),
      files: {},
      updatedAt: NOW,
    });
  });

  it("does not expose another user's saved flows", async () => {
    const harness = withSalesFlow();

    expect(await harness.callOk("flows.search", { query: "" }, BOB)).toEqual([]);
    expect(await harness.callError("flows.get", { flowId: "ventas" }, BOB)).toContain("ventas");
  });

  it.each(["flows.get", "flows.diff", "flows.apply", "flows.discard"])(
    "does not expose another user's draft through %s",
    async (name) => {
      const { harness, draftId } = await changedDraft();

      expect(await harness.callError(name, { draftId }, BOB)).toContain(draftId);
      expect(await harness.getFlow({ draftId })).toBeDefined();
    },
  );
});
