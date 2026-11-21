import type { NodeManifest } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { findUnsafeInterpolations } from "./template-safety.ts";

const sqlNode = (template: string): NodeManifest => ({
  id: "core.test",
  version: "0.1.0",
  name: "Prueba",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { type: "string" },
      op: { enum: ["=", "!="] },
      columns: { type: "array", items: { type: "string" } },
      aggregations: {
        type: "array",
        items: {
          type: "object",
          properties: { column: { type: "string" }, fn: { enum: ["SUM", "AVG"] } },
        },
      },
      query: { type: "string", "x-nodomics": { widget: "code", language: "sql" } },
    },
  },
  impl: { kind: "sql", template },
});

describe("findUnsafeInterpolations", () => {
  it("accepts params escaped with ident and lit, and input ports", () => {
    const node = sqlNode("SELECT * FROM {{in}} WHERE {{ident column}} = {{lit value}}");

    expect(findUnsafeInterpolations(node)).toEqual([]);
  });

  it("accepts a param restricted by an enum", () => {
    expect(findUnsafeInterpolations(sqlNode("{{ident column}} {{op}} 1"))).toEqual([]);
  });

  it("accepts the source, eq and concat helpers inside allowed expressions", () => {
    const node = sqlNode(
      "{{source sourceId}} {{#if (eq op '=')}}{{lit (concat '%' column '%')}}{{else}}x{{/if}}",
    );

    expect(findUnsafeInterpolations(node)).toEqual([]);
  });

  it("accepts the request helper with named parameters", () => {
    expect(
      findUnsafeInterpolations(
        sqlNode(
          "SELECT * FROM {{request url query=query headers=headers format=format records=records}}",
        ),
      ),
    ).toEqual([]);
  });

  it("rejects a free param interpolated without a helper", () => {
    expect(findUnsafeInterpolations(sqlNode("WHERE {{column}} = 1"))).toEqual(["{{column}}"]);
  });

  it("rejects a helper outside the allowed set", () => {
    expect(findUnsafeInterpolations(sqlNode("{{lookup column 0}}"))).toEqual([
      "{{lookup column 0}}",
    ]);
  });

  it("rejects concat used to print raw text", () => {
    expect(findUnsafeInterpolations(sqlNode("{{concat column 'x'}}"))).toEqual([
      "{{concat column 'x'}}",
    ]);
  });

  it("rejects an unknown helper inside a subexpression", () => {
    expect(findUnsafeInterpolations(sqlNode("{{lit (lookup column 0)}}"))).toEqual([
      "{{lit (lookup column 0)}}",
    ]);
  });

  it("rejects triple-stash interpolation", () => {
    expect(findUnsafeInterpolations(sqlNode("{{{op}}}"))).toEqual(["{{{op}}}"]);
  });

  it("rejects a block helper other than if, unless and each", () => {
    expect(findUnsafeInterpolations(sqlNode("{{#with column}}x{{/with}}"))).toEqual([
      "{{#with column}}",
    ]);
  });

  it("resolves enum fields of array items inside each", () => {
    const node = sqlNode(
      "{{#each aggregations}}{{#unless @first}}, {{/unless}}{{fn}}({{ident column}}){{/each}}",
    );

    expect(findUnsafeInterpolations(node)).toEqual([]);
  });

  it("rejects a free item printed inside each", () => {
    expect(findUnsafeInterpolations(sqlNode("{{#each columns}}{{this}}{{/each}}"))).toEqual([
      "{{this}}",
    ]);
  });

  it("does not treat input ports as safe inside each", () => {
    expect(findUnsafeInterpolations(sqlNode("{{#each columns}}{{in}}{{/each}}"))).toEqual([
      "{{in}}",
    ]);
  });

  it("rejects a raw code param", () => {
    expect(findUnsafeInterpolations(sqlNode("{{query}}"))).toEqual(["{{query}}"]);
  });

  it("finds nothing in nodes that are not SQL", () => {
    const viewNode: NodeManifest = { ...sqlNode(""), impl: { kind: "view", spec: "{{column}}" } };

    expect(findUnsafeInterpolations(viewNode)).toEqual([]);
  });
});
