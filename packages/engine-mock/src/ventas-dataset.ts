import type { Row, Table } from "./table.ts";

const ROW_COUNT = 50;
const REGIONS = ["Norte", "Sur", "Este", "Oeste"] as const;
const PRODUCTS = ["Café", "Té", "Cacao", "Yerba", "Azúcar"] as const;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_MONTH = 28;
// A few missing prices give data.profile real nulls to count.
const MISSING_PRICE_EVERY = 17;

const twoDigits = (value: number) => String(value).padStart(2, "0");

const pickCyclic = <T>(values: readonly [T, ...T[]], index: number): T =>
  values[index % values.length] ?? values[0];

const ventasRow = (index: number): Row => [
  `2024-${twoDigits(1 + (index % MONTHS_PER_YEAR))}-${twoDigits(1 + ((index * 7) % DAYS_PER_MONTH))}`,
  pickCyclic(REGIONS, index),
  pickCyclic(PRODUCTS, index * 3),
  1 + ((index * 37) % 50),
  index % MISSING_PRICE_EVERY === MISSING_PRICE_EVERY - 1 ? null : 5 + ((index * 13) % 20) / 2,
];

/** The fixed "ventas" dataset every mock source reads: deterministic, ~50 rows. */
export const VENTAS: Table = {
  columns: [
    { name: "fecha", type: "date" },
    { name: "region", type: "text" },
    { name: "producto", type: "text" },
    { name: "unidades", type: "number" },
    { name: "precio", type: "number" },
  ],
  rows: Array.from({ length: ROW_COUNT }, (_, index) => ventasRow(index)),
};
