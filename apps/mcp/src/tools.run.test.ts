import { describe, expect, it } from "vitest";
import {
  ALICE,
  RUN_RESULT,
  SAMPLE,
  SALES_FLOW,
  createHarness,
  salesDocument,
} from "./tools.fixtures.ts";

const withSalesFlow = (runnerFailure?: string) =>
  createHarness({
    flows: [{ userId: ALICE.userId, document: salesDocument() }],
    ...(runnerFailure === undefined ? {} : { runnerFailure }),
  });

describe("execution tools", () => {
  it("passes the saved flow and requested targets to the runner", async () => {
    const harness = withSalesFlow();

    const result = await harness.callOk("run.flow", { flowId: "ventas", upTo: ["top"] });

    expect(result).toEqual(RUN_RESULT);
    expect(harness.runnerCalls).toEqual([{ method: "run", flow: SALES_FLOW, upTo: ["top"] }]);
  });

  it("samples a draft with page zero by default", async () => {
    const harness = withSalesFlow();
    const { draftId } = await harness.createDraft("ventas");
    await harness.callOk("flows.remove_node", { draftId, nodeId: "top" });
    const flow = await harness.getFlow({ draftId });

    const sample = await harness.callOk("run.sample", { draftId, nodeId: "src", port: "out" });

    expect(sample).toEqual(SAMPLE);
    expect(harness.runnerCalls).toEqual([
      { method: "sample", flow, request: { nodeId: "src", port: "out", page: 0 } },
    ]);
  });

  it("passes the requested sample page to the runner", async () => {
    const harness = withSalesFlow();

    await harness.callOk("run.sample", { flowId: "ventas", nodeId: "src", port: "out", page: 3 });

    expect(harness.runnerCalls).toEqual([
      { method: "sample", flow: SALES_FLOW, request: { nodeId: "src", port: "out", page: 3 } },
    ]);
  });

  it("passes the flow and node to the log reader", async () => {
    const harness = withSalesFlow();

    const logs = await harness.callOk("run.logs", { flowId: "ventas", nodeId: "top" });

    expect(logs).toEqual({ nodeId: "top", lines: ["hola"] });
    expect(harness.runnerCalls).toEqual([{ method: "logs", flow: SALES_FLOW, nodeId: "top" }]);
  });

  it.each(["run.flow", "run.sample", "run.logs"])(
    "returns an executor error from %s",
    async (name) => {
      const harness = withSalesFlow("Executor unavailable");

      expect(await harness.callError(name, { flowId: "ventas", nodeId: "src", port: "out" })).toBe(
        "Executor unavailable",
      );
    },
  );

  it("rejects an unknown tool name", async () => {
    const harness = withSalesFlow();

    expect(await harness.call("unknown", {})).toBe("unknown-tool");
  });

  it.each([
    ["flows.create_draft", { flowId: 2 }],
    ["flows.add_node", { draftId: "x", nodeId: "n" }],
    ["flows.apply", { draftId: "x", changeIds: "one" }],
    ["flows.batch", { draftId: "x", ops: [{ op: "unknown", args: {} }] }],
    ["run.sample", { flowId: "ventas", nodeId: "src", port: "out", page: -1 }],
    ["run.sample", { flowId: "ventas", nodeId: "src", port: "out", page: 0.5 }],
    ["run.logs", { flowId: "ventas" }],
  ])("rejects invalid arguments to %s", async (name, args) => {
    const harness = withSalesFlow();

    expect(await harness.call(name, args)).toBe("invalid-args");
    expect(harness.runnerCalls).toEqual([]);
  });
});
