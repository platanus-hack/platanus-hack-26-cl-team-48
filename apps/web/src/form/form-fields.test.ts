import { describe, expect, it } from "vitest";
import { describeFormFields } from "./form-fields.ts";

const paramsOf = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object" as const,
  properties,
  required,
});

const kindsOf = (properties: Record<string, unknown>) =>
  describeFormFields(paramsOf(properties)).map((field) => field.widget.kind);

describe("describeFormFields", () => {
  it("creates one field per property, labelled by its title or name", () => {
    const fields = describeFormFields(
      paramsOf({ value: { title: "Valor", type: "string" }, other: { type: "string" } }, ["value"]),
    );

    expect(fields.map(({ name, label, isRequired }) => ({ name, label, isRequired }))).toEqual([
      { name: "value", label: "Valor", isRequired: true },
      { name: "other", label: "other", isRequired: false },
    ]);
  });

  it("chooses widgets by type", () => {
    expect(
      kindsOf({
        a: { type: "string" },
        b: { type: "number" },
        c: { type: "integer" },
        d: { type: "boolean" },
      }),
    ).toEqual(["text", "number", "number", "switch"]);
  });

  it("chooses a select for enums, whatever their type", () => {
    const [field] = describeFormFields(paramsOf({ op: { enum: ["=", ">"], default: "=" } }));

    expect(field?.widget).toEqual({ kind: "enum", options: ["=", ">"] });
    expect(field?.defaultValue).toBe("=");
  });

  it("names each option by its title when the schema lists them as constants", () => {
    const [field] = describeFormFields(
      paramsOf({
        unit: {
          oneOf: [
            { const: "yearmonth", title: "Mes" },
            { const: "year", title: "Año" },
          ],
        },
      }),
    );

    expect(field?.widget).toEqual({
      kind: "enum",
      options: [
        { value: "", label: "Sin valor" },
        { value: "yearmonth", label: "Mes" },
        { value: "year", label: "Año" },
      ],
    });
  });

  it("offers clearing a select with a default only through its own null constant", () => {
    const fields = describeFormFields(
      paramsOf({
        op: { enum: ["=", ">"], default: "=" },
        unit: {
          oneOf: [
            { const: null, title: "Sin agrupar" },
            { const: "year", title: "Año" },
          ],
          default: "year",
        },
      }),
    );

    expect(fields.map((field) => field.widget)).toEqual([
      { kind: "enum", options: ["=", ">"] },
      {
        kind: "enum",
        options: [
          { value: "", label: "Sin agrupar" },
          { value: "year", label: "Año" },
        ],
      },
    ]);
  });

  it("reads the column types a column param accepts and the condition a param applies under", () => {
    const [x, unit] = describeFormFields(
      paramsOf(
        {
          x: {
            type: "string",
            "x-nodomics": { widget: "column", of: "in", types: ["date", "number"] },
          },
          unit: {
            enum: ["year"],
            default: "year",
            "x-nodomics": { when: { param: "x", types: ["date"] } },
          },
        },
        ["x"],
      ),
    );

    expect(x?.widget).toEqual({ kind: "column", port: "in", types: ["date", "number"] });
    expect(x?.condition).toBeUndefined();
    expect(unit?.widget).toEqual({ kind: "enum", options: ["year"] });
    expect(unit?.condition).toEqual({ param: "x", types: ["date"] });
  });

  it("describes declared output columns and a required figure", () => {
    const [columns, mustShow] = describeFormFields(
      paramsOf({
        columns: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { title: "Nombre", type: "string" } },
            required: ["name"],
          },
          "x-nodomics": { widget: "port-schema", port: "out" },
        },
        mustShow: { type: "boolean", "x-nodomics": { widget: "switch", requires: "display" } },
      }),
    );

    expect(columns?.widget).toMatchObject({ kind: "port-schema", port: "out" });
    expect(
      columns?.widget.kind === "port-schema" && columns.widget.fields.map((f) => f.name),
    ).toEqual(["name"]);
    expect(mustShow?.widget).toEqual({ kind: "switch" });
  });

  it("chooses the x-nodomics widget over the plain type", () => {
    expect(
      describeFormFields(
        paramsOf({
          column: { type: "string", "x-nodomics": { widget: "column", of: "in" } },
          sourceId: { type: "string", "x-nodomics": { widget: "source" } },
          code: { type: "string", "x-nodomics": { widget: "code", language: "python" } },
        }),
      ).map((field) => field.widget),
    ).toEqual([
      { kind: "column", port: "in" },
      { kind: "source" },
      { kind: "code", language: "python" },
    ]);
  });

  it("chooses a multiple column picker for arrays of columns", () => {
    const [field] = describeFormFields(
      paramsOf({
        columns: {
          type: "array",
          items: { type: "string", "x-nodomics": { widget: "column", of: "in" } },
        },
      }),
    );

    expect(field?.widget).toEqual({ kind: "column-list", port: "in" });
  });

  it("describes arrays of objects as a list of nested fields", () => {
    const [field] = describeFormFields(
      paramsOf({
        aggregations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string", "x-nodomics": { widget: "column", of: "in" } },
              fn: { enum: ["SUM", "AVG"], default: "SUM" },
            },
            required: ["column"],
          },
        },
      }),
    );

    expect(field?.widget.kind).toBe("object-list");
    expect(
      field?.widget.kind === "object-list" && field.widget.fields.map((f) => f.widget.kind),
    ).toEqual(["column", "enum"]);
  });

  it("marks schemas it cannot render as unsupported instead of failing", () => {
    expect(kindsOf({ odd: { type: "null" }, weird: 42 })).toEqual(["unsupported", "unsupported"]);
  });

  it("keeps numeric limits for number fields", () => {
    const [field] = describeFormFields(
      paramsOf({ n: { type: "integer", minimum: 1, maximum: 1000 } }),
    );

    expect(field?.widget).toEqual({ kind: "number", isInteger: true, minimum: 1, maximum: 1000 });
  });
});
