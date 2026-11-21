import { sumByGroup } from "./table-math.ts";

const REGIONS = ["Centro", "Este", "Norte", "Oeste", "Sur"] as const;
const MAX_UNITS = 50;
// A step coprime with MAX_UNITS spreads every unit count over every region.
const UNITS_STEP = 7;

export type MillionRows = {
  readonly csv: string;
  /** Sum of "unidades" per region over the rows with more than `minUnits` units. */
  readonly expectedTotals: Array<[string, number]>;
};

/** A deterministic sales table and the totals that filtering and grouping it must give. */
export function describeMillionRows(options: {
  readonly rowCount: number;
  readonly minUnits: number;
}): MillionRows {
  const rows = Array.from({ length: options.rowCount }, (_, index) => ({
    region: REGIONS[index % REGIONS.length] ?? "",
    unidades: (index * UNITS_STEP) % MAX_UNITS,
  }));
  return {
    csv: `region,unidades\n${rows.map((row) => `${row.region},${String(row.unidades)}`).join("\n")}\n`,
    expectedTotals: sumByGroup(
      rows.filter((row) => row.unidades > options.minUnits),
      "region",
      "unidades",
    ),
  };
}
