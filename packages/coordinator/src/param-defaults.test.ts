import { describe, expect, it } from "vitest";
import { applyParamDefaults } from "./param-defaults.ts";
import { filterManifest } from "./testing/catalog-fixtures.ts";

describe("applyParamDefaults", () => {
  it("fills params the user left empty with the schema defaults", () => {
    expect(applyParamDefaults(filterManifest.params, { column: "a" })).toEqual({
      column: "a",
      op: "=",
    });
  });

  it("keeps the values the user chose", () => {
    expect(applyParamDefaults(filterManifest.params, { op: ">" })).toEqual({ op: ">" });
  });
});
