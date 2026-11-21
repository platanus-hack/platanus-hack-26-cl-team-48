import { describe, expect, it } from "vitest";
import { parseCsv, sumByGroup, zScores } from "./table-math.ts";

describe("parseCsv", () => {
  it("reads a header and rows into records", () => {
    expect(parseCsv("region,unidades\nSur,3\nNorte,4\n")).toEqual([
      { region: "Sur", unidades: "3" },
      { region: "Norte", unidades: "4" },
    ]);
  });
});

describe("zScores", () => {
  it("uses the population standard deviation", () => {
    expect(zScores([1, 2, 3])).toEqual([-Math.sqrt(1.5), 0, Math.sqrt(1.5)]);
  });
});

describe("sumByGroup", () => {
  it("sums a value per group, ordered by group", () => {
    const rows = [
      { region: "Sur", unidades: 3 },
      { region: "Norte", unidades: 4 },
      { region: "Sur", unidades: 5 },
    ];

    expect(sumByGroup(rows, "region", "unidades")).toEqual([
      ["Norte", 4],
      ["Sur", 8],
    ]);
  });
});
