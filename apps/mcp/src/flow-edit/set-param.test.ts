import { coreNodes } from "@nodomics/nodes-core";
import { describe, expect, it } from "vitest";
import { applyOp } from "./index.ts";
import {
  deepFreeze,
  errorOf,
  flowOf,
  node,
  nodeById,
  pipelineFlow,
  testCatalog,
  unwrap,
} from "./test-fixtures.ts";

const setParam = (nodeId: string, name: string, value: unknown) =>
  ({ op: "set_param", args: { nodeId, name, value } }) as const;

const paramsAfter = (name: string, value: unknown) =>
  nodeById(unwrap(applyOp(pipelineFlow(), setParam("tr", name, value), testCatalog)), "tr")?.params;

describe("set_param", () => {
  it("stores a valid value in the node params", () => {
    const flow = pipelineFlow();

    const result = unwrap(applyOp(flow, setParam("tr", "n", 7), testCatalog));

    expect(nodeById(result, "tr")?.params).toEqual({ n: 7, name: "x" });
  });

  it("stores a param that the node did not have yet", () => {
    const params = paramsAfter("flag", true);

    expect(params).toMatchObject({ flag: true });
  });

  it.each<[string, unknown]>([
    ["mode", "b"],
    ["kind", "y"],
    ["name", "z"],
    ["ratio", 2.5],
    ["tags", ["a", "b"]],
    ["n", 0],
    ["n", 10],
  ])("accepts %s = %j", (name, value) => {
    const params = paramsAfter(name, value);

    expect(params?.[name]).toEqual(value);
  });

  it.each<[string, unknown, string]>([
    ["n", "3", "a string for an integer"],
    ["n", 2.5, "a fraction for an integer"],
    ["n", -1, "a value below the minimum"],
    ["n", 11, "a value above the maximum"],
    ["mode", "c", "a value outside the enum"],
    ["kind", "z", "a value outside the oneOf consts"],
    ["name", "", "a string shorter than minLength"],
    ["name", 5, "a number for a string"],
    ["flag", "true", "a string for a boolean"],
    ["ratio", "1", "a string for a number"],
    ["tags", "a", "a string for an array"],
  ])("rejects %s = %j (%s)", (...[name, value]: [string, unknown, string]) => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, setParam("tr", name, value), testCatalog));

    expect(message).toContain(name);
  });

  it("validates against the schema of a core node", () => {
    const flow = flowOf([node("tabla", "core.view.table", { rows: 20, columns: ["a"] })]);

    const result = applyOp(flow, setParam("tabla", "rows", 5000), coreNodes);

    expect(result.ok).toBe(false);
  });

  it("returns an error for a param the manifest does not declare", () => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, setParam("tr", "unknown", 1), testCatalog));

    expect(message).toContain("unknown");
  });

  it("returns an error for a node that does not exist", () => {
    const flow = pipelineFlow();

    const message = errorOf(applyOp(flow, setParam("ghost", "n", 1), testCatalog));

    expect(message).toContain("ghost");
  });

  it("does not mutate the input flow", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, setParam("tr", "n", 7), testCatalog);

    expect(result.ok).toBe(true);
    expect(flow).toEqual(pipelineFlow());
  });

  it("leaves the input flow unchanged when the value is invalid", () => {
    const flow = deepFreeze(pipelineFlow());

    const result = applyOp(flow, setParam("tr", "n", 99), testCatalog);

    expect(result.ok).toBe(false);
    expect(flow).toEqual(pipelineFlow());
  });
});
