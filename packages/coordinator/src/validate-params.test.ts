import { queryHarness, queryFlow } from "./testing/query-fixtures.ts";
import { describe, expect, it } from "vitest";
import type { FlatNode } from "./flat-graph.ts";
import { filterManifest } from "./testing/catalog-fixtures.ts";
import { validateParams } from "./validate-params.ts";

const filterNode = (params: Record<string, unknown>): FlatNode => ({
  id: "f",
  origin: "f",
  type: filterManifest.id,
  version: filterManifest.version,
  params,
  manifest: filterManifest,
});

describe("validateParams", () => {
  it("accepts params that satisfy the manifest schema", () => {
    expect(validateParams(filterNode({ column: "a", op: ">", value: "1" }))).toEqual([]);
  });

  it("reports each missing required param as PARAM_REQUIRED", () => {
    expect(validateParams(filterNode({ op: "=" }))).toMatchObject([
      { nodeId: "f", code: "PARAM_REQUIRED", param: "column" },
      { nodeId: "f", code: "PARAM_REQUIRED", param: "value" },
    ]);
  });

  it("reports a value outside its enum as PARAM_INVALID", () => {
    expect(validateParams(filterNode({ column: "a", op: "; DROP", value: "1" }))).toMatchObject([
      { nodeId: "f", code: "PARAM_INVALID", param: "op" },
    ]);
  });

  it("reports a value of the wrong type as PARAM_INVALID", () => {
    expect(validateParams(filterNode({ column: 3, value: "1" }))).toMatchObject([
      { nodeId: "f", code: "PARAM_INVALID", param: "column" },
    ]);
  });
});

it.each([{ not: { required: ["op"] } }, { maxProperties: 0 }])(
  "reports root validation failures for %j",
  (constraint) => {
    const node = filterNode({ column: "x", value: "1", op: "; DROP" });
    expect(
      validateParams({
        ...node,
        manifest: { ...node.manifest, params: { type: "object", properties: {}, ...constraint } },
      }),
    ).toContainEqual(expect.objectContaining({ nodeId: "f", code: "PARAM_INVALID" }));
  },
);

it("never sends SQL forbidden by a root schema constraint to the executor", async () => {
  const harness = queryHarness();

  const runId = await harness.setAndRun(queryFlow("; DROP TABLE t; --"), 1);

  expect(harness.sql.tasks).toEqual([]);
  expect(harness.events("node.status").find((event) => event.state === "error")).toMatchObject({
    runId,
    nodeId: "q",
    state: "error",
    error: { code: "PARAM_INVALID" },
  });
});
