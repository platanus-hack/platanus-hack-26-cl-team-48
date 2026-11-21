import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCsv, sumByGroup, zScores } from "./table-math.ts";

// The "ventas" sample the app ships; the suite reads the same file to compute expected results.
const SALES_CSV = fileURLToPath(
  new URL("../../../../packages/nodes-core/datasets/ventas.csv", import.meta.url),
);

export const SALES_COLUMNS = ["fecha", "region", "producto", "unidades", "precio"] as const;

const sales = () =>
  parseCsv(readFileSync(SALES_CSV, "utf8")).map((row) => ({
    region: row["region"] ?? "",
    unidades: Number(row["unidades"]),
    precio: Number(row["precio"]),
  }));

export const salesRowCount = (): number => sales().length;

export const salesAbove = (minUnits: number): number =>
  sales().filter((row) => row.unidades > minUnits).length;

export const salesTotalsAbove = (minUnits: number): Array<[string, number]> =>
  sumByGroup(
    sales().filter((row) => row.unidades > minUnits),
    "region",
    "unidades",
  );

export const salesPriceZScores = (): number[] => zScores(sales().map((row) => row.precio));
