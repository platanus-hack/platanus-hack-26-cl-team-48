import { describe, expect, it } from "vitest";
import { fillViewSpec } from "./fill-view-spec.ts";

const NO_DATA = { rows: [], columns: [] };

describe("fillViewSpec", () => {
  it("replaces a string that is exactly a placeholder with the param value and its type", () => {
    const spec = { encoding: { x: { field: "{{x}}" } }, layers: "{{columns}}" };

    expect(fillViewSpec(spec, { x: "region", columns: ["a", "b"] }, NO_DATA)).toEqual({
      encoding: { x: { field: "region" } },
      layers: ["a", "b"],
      data: { values: [] },
    });
  });

  it("replaces placeholders inside a longer text as text", () => {
    expect(
      fillViewSpec({ title: "Total por {{x}} ({{n}})" }, { x: "región", n: 3 }, NO_DATA),
    ).toEqual({
      title: "Total por región (3)",
      data: { values: [] },
    });
  });

  it("puts the rows in the spec data", () => {
    expect(fillViewSpec({ mark: "bar" }, {}, { rows: [{ a: 1 }], columns: [] })).toEqual({
      mark: "bar",
      data: { values: [{ a: 1 }] },
    });
  });

  it("leaves out a property whose param has no value", () => {
    const spec = {
      encoding: { x: { field: "{{x}}", timeUnit: "utc{{unit}}" }, title: "{{title}}" },
    };

    expect(fillViewSpec(spec, { x: "fecha" }, NO_DATA)).toEqual({
      encoding: { x: { field: "fecha" } },
      data: { values: [] },
    });
  });

  it("leaves out an object whose params all lack a value", () => {
    const spec = {
      encoding: { color: { field: "{{series}}", type: "nominal" }, y: { field: "y" } },
    };

    expect(fillViewSpec(spec, {}, NO_DATA)).toEqual({
      encoding: { y: { field: "y" } },
      data: { values: [] },
    });
  });

  it("gives the Vega-Lite type of the column a param names", () => {
    const spec = { x: "{{vegaType x}}", y: "{{vegaType y}}", color: "{{vegaType z}}" };
    const columns = [
      { name: "fecha", type: "date" as const },
      { name: "total", type: "number" as const },
      { name: "region", type: "text" as const },
    ];

    expect(
      fillViewSpec(spec, { x: "fecha", y: "total", z: "region" }, { rows: [], columns }),
    ).toEqual({ x: "temporal", y: "quantitative", color: "nominal", data: { values: [] } });
  });
});
