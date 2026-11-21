import { NepErrorCode } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createHarness, type HarnessOptions } from "./testing/coordinator-harness.ts";
import { edge, flowNode, flowOf } from "./testing/catalog-fixtures.ts";

const withSource = (options: HarnessOptions = {}) =>
  createHarness({
    ...options,
    presetSources: { src_1: { format: "csv", location: { kind: "url", url: "https://x/v.csv" } } },
  });

const sourceFilterChart = flowOf(
  [
    flowNode("s", "core.source", { sourceId: "src_1" }),
    flowNode("f", "core.filter", { column: "x", value: "1" }),
    flowNode("v", "core.chart", { x: "region" }),
  ],
  [edge("s", "f"), edge("f", "v")],
);

describe("createCoordinator: schema.infer", () => {
  it("renders the SQL chain and runs it with LIMIT 0 on the SQL executor before any run", async () => {
    const harness = withSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceFilterChart });

    const inferred = await harness.coordinator["schema.infer"]({ nodeId: "f", port: "out" });

    expect(inferred).toEqual({ ok: true, columns: [{ name: "x", type: "number" }] });
    expect(harness.sql.tasks[0]).toMatchObject({ kind: "sql" });
    expect(harness.sql.tasks[0]?.kind === "sql" && harness.sql.tasks[0].query).toMatch(/ LIMIT 0$/);
  });

  it("releases the result of the inference query", async () => {
    const harness = withSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceFilterChart });

    await harness.coordinator["schema.infer"]({ nodeId: "f", port: "out" });

    expect(harness.sql.calls.at(-1)?.method).toBe("exec.drop");
    expect(harness.sql.heldResultIds()).toHaveLength(1);
  });

  it("answers from the cache when the node already ran", async () => {
    const harness = withSource();
    await harness.setAndRun(sourceFilterChart, 1);
    const tasksBefore = harness.sql.tasks.length;

    const inferred = await harness.coordinator["schema.infer"]({ nodeId: "f", port: "out" });

    expect(inferred.ok).toBe(true);
    expect(harness.sql.tasks).toHaveLength(tasksBefore);
  });

  it("returns the node error when the node is misconfigured", async () => {
    const harness = withSource();
    await harness.coordinator["flow.set"]({
      rev: 1,
      flow: flowOf([flowNode("s", "core.source", {})], []),
    });

    await expect(
      harness.coordinator["schema.infer"]({ nodeId: "s", port: "out" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PARAM_REQUIRED" },
    });
  });

  it("rejects a node that is not in the current flow", async () => {
    const harness = withSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceFilterChart });

    await expect(
      harness.coordinator["schema.infer"]({ nodeId: "zz", port: "out" }),
    ).rejects.toMatchObject({
      code: NepErrorCode.UNKNOWN_NODE,
    });
  });
});

describe("createCoordinator: data.page and data.profile", () => {
  it("pages a result through the executor that holds it", async () => {
    const harness = withSource();
    await harness.setAndRun(sourceFilterChart, 1);
    const ref = harness.events("node.result")[1]?.ref.id ?? "";

    const page = await harness.coordinator["data.page"]({ ref, offset: 1, limit: 10 });

    expect(page).toEqual({ columns: [{ name: "x", type: "number" }], rows: [[1], [2]], total: 3 });
  });

  it("profiles a result through the executor that holds it", async () => {
    const harness = withSource();
    await harness.setAndRun(sourceFilterChart, 1);
    const ref = harness.events("node.result")[1]?.ref.id ?? "";

    await expect(harness.coordinator["data.profile"]({ ref })).resolves.toMatchObject({
      columns: [{ name: "x" }],
    });
  });

  it("answers RESULT_EXPIRED for an unknown reference", async () => {
    const harness = withSource();

    await expect(
      harness.coordinator["data.page"]({ ref: "gone", offset: 0, limit: 10 }),
    ).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });
});

describe("createCoordinator: data.view", () => {
  it("fills the view spec with the node params and the rows of its input", async () => {
    const harness = withSource();
    await harness.setAndRun(sourceFilterChart, 1);

    const view = await harness.coordinator["data.view"]({ nodeId: "v" });

    expect(view).toEqual({
      spec: {
        mark: "bar",
        encoding: { x: { field: "region" } },
        data: { values: [{ x: 0 }, { x: 1 }, { x: 2 }] },
      },
      rowCount: 3,
      sampled: false,
    });
  });

  it("reads the rows with a SQL query capped at 5000 rows", async () => {
    const harness = withSource({ sqlRowCount: 6000 });
    await harness.setAndRun(sourceFilterChart, 1);

    const view = await harness.coordinator["data.view"]({ nodeId: "v" });

    expect(harness.sql.tasks.at(-1)).toMatchObject({ query: 'SELECT * FROM "data" LIMIT 5000' });
    expect(view).toMatchObject({ rowCount: 5000, sampled: true });
  });

  it("answers RESULT_EXPIRED when the view's input has not run", async () => {
    const harness = withSource();
    await harness.coordinator["flow.set"]({ rev: 1, flow: sourceFilterChart });

    await expect(harness.coordinator["data.view"]({ nodeId: "v" })).rejects.toMatchObject({
      code: NepErrorCode.RESULT_EXPIRED,
    });
  });
});
