/** Reference calculations the suite checks the app's results against. */

export type CsvRecord = Readonly<Record<string, string>>;

/** Reads a CSV without quoted fields, which is all the suite's datasets use. */
export function parseCsv(text: string): CsvRecord[] {
  const [header = "", ...lines] = text.trim().split("\n");
  const columns = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
  });
}

/** Same definition as the "Puntaje Z" node: deviations from the mean over the population deviation. */
export function zScores(values: ReadonlyArray<number>): number[] {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length,
  );
  return values.map((value) => (value - mean) / deviation);
}

/** Totals of one numeric column per group, ordered by group like the "Agrupar" node. */
export function sumByGroup<Row extends Readonly<Record<string, string | number>>>(
  rows: ReadonlyArray<Row>,
  group: keyof Row & string,
  value: keyof Row & string,
): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const row of rows)
    totals.set(String(row[group]), (totals.get(String(row[group])) ?? 0) + Number(row[value]));
  return [...totals].sort(([left], [right]) => compareText(left, right));
}

const compareText = (left: string, right: string) => (left < right ? -1 : Number(left > right));
