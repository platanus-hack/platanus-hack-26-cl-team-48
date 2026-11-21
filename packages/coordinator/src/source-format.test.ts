import { describe, expect, it } from "vitest";
import { sourceFormatOf } from "./source-format.ts";

describe("sourceFormatOf", () => {
  it.each([
    ["ventas.csv", "csv"],
    ["notas.TXT?download=1", "txt"],
    ["https://x.org/data/Ventas.PARQUET?dl=1", "parquet"],
    ["/home/ana/datos.json", "json"],
  ])("reads the format of %s from its extension", (name, format) => {
    expect(sourceFormatOf(name)).toEqual({ ok: true, value: format });
  });

  it("rejects names without a supported extension", () => {
    expect(sourceFormatOf("ventas.xlsx").ok).toBe(false);
  });
});
