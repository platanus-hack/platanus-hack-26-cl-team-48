import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { findCaseIssues } from "./case-shape.ts";

const limitNode: NodeManifest = {
  id: "core.limit",
  version: "0.1.0",
  name: "Limitar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: { type: "object", properties: { n: { type: "integer" } }, required: ["n"] },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} LIMIT {{lit n}}" },
};

const table = { columns: [{ name: "x", type: "number" }], rows: [[1], [2]] };

const limitCase = {
  name: "keeps the first row",
  params: { n: 1 },
  inputs: { in: table },
  expected: { out: { ...table, rows: [[1]] } },
};

describe("findCaseIssues", () => {
  it("accepts cases with params, input tables and expected tables", () => {
    expect(findCaseIssues(limitNode, { cases: [limitCase] })).toEqual([]);
  });

  it("accepts source tables for source nodes", () => {
    const sourceNode: NodeManifest = {
      ...limitNode,
      inputs: [],
      params: { type: "object", properties: {} },
    };
    const sourceCase = { ...limitCase, params: {}, inputs: {}, sources: { ventas: table } };

    expect(findCaseIssues(sourceNode, { cases: [sourceCase] })).toEqual([]);
  });

  it("accepts a Vega-Lite spec as the expected value of a chart port", () => {
    const viewNode: NodeManifest = { ...limitNode, outputs: [{ id: "out", type: "chart" }] };
    const viewCase = { ...limitCase, expected: { out: { mark: "bar" } } };

    expect(findCaseIssues(viewNode, { cases: [viewCase] })).toEqual([]);
  });

  it.each([
    null,
    [],
    { "https://api.example.test": {} },
    { "https://api.example.test": { body: [], status: "200" } },
  ])("rejects malformed response maps: %j", (responses) => {
    expect(
      findCaseIssues(limitNode, { cases: [{ ...limitCase, responses }] }).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    {},
    { "https://api.example.test": { body: { data: [] } } },
    { "https://api.example.test": { body: "x,y\n1,a", status: 200 } },
  ])("accepts simulated responses: %j", (responses) => {
    expect(findCaseIssues(limitNode, { cases: [{ ...limitCase, responses }] })).toEqual([]);
  });

  it("requires at least one case", () => {
    expect(findCaseIssues(limitNode, { cases: [] })).toEqual(["cases: needs at least one case"]);
  });

  it("reports a missing required param", () => {
    expect(findCaseIssues(limitNode, { cases: [{ ...limitCase, params: {} }] })).toEqual([
      'cases[0].params: missing required param "n"',
    ]);
  });

  it("reports inputs that do not match the input ports", () => {
    expect(
      findCaseIssues(limitNode, { cases: [{ ...limitCase, inputs: { left: table } }] }),
    ).toEqual(["cases[0].inputs: expected ports [in], got [left]"]);
  });

  it("reports expected values that do not match the output ports", () => {
    expect(findCaseIssues(limitNode, { cases: [{ ...limitCase, expected: {} }] })).toEqual([
      "cases[0].expected: expected ports [out], got []",
    ]);
  });

  it("reports a table column with an unknown type", () => {
    const badTable = { columns: [{ name: "x", type: "matrix" }], rows: [] };

    expect(
      findCaseIssues(limitNode, { cases: [{ ...limitCase, inputs: { in: badTable } }] }),
    ).toEqual(["cases[0].inputs.in: columns[0] is not a column"]);
  });

  it("reports a row whose length differs from the columns", () => {
    const badTable = { ...table, rows: [[1, 2]] };

    expect(
      findCaseIssues(limitNode, { cases: [{ ...limitCase, inputs: { in: badTable } }] }),
    ).toEqual(["cases[0].inputs.in: rows[0] must have 1 values"]);
  });

  it("reports a case without a name", () => {
    expect(findCaseIssues(limitNode, { cases: [{ ...limitCase, name: "" }] })).toEqual([
      "cases[0].name: must be a non-empty string",
    ]);
  });
});
