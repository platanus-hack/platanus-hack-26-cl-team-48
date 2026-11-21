import { describe, expect, it } from "vitest";
import { describeMillionRows } from "./million-rows.ts";
import { parseCsv, sumByGroup } from "./table-math.ts";

describe("describeMillionRows", () => {
  it("writes the rows whose filtered totals it predicts", () => {
    const sample = describeMillionRows({ rowCount: 1000, minUnits: 20 });

    const rows = parseCsv(sample.csv)
      .map((row) => ({ region: row["region"] ?? "", unidades: Number(row["unidades"]) }))
      .filter((row) => row.unidades > 20);

    expect(parseCsv(sample.csv)).toHaveLength(1000);
    expect(sample.expectedTotals).toEqual(sumByGroup(rows, "region", "unidades"));
  });
});
