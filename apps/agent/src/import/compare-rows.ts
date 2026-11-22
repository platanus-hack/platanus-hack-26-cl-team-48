import type { Row } from "./import-report.ts";

export const NUMERIC_TOLERANCE = 1e-9;

export type CompareOptions = {
  readonly ordered?: boolean | undefined;
};

export type CompareResult = {
  readonly equal: boolean;
  readonly diff: string;
};

type CellValue = string | number | boolean | null;

function areCellsEqual(a: CellValue, b: CellValue): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= NUMERIC_TOLERANCE;
  }
  return a === b;
}

function areRowsEqual(a: Row, b: Row): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    return areCellsEqual(a[key] ?? null, b[key] ?? null);
  });
}

function compareOrdered(expected: readonly Row[], observed: readonly Row[]): CompareResult {
  for (let i = 0; i < expected.length; i += 1) {
    const expRow = expected[i];
    const obsRow = observed[i];
    if (!expRow || !obsRow || !areRowsEqual(expRow, obsRow)) {
      return {
        equal: false,
        diff: `Row mismatch at index ${String(i)}: expected ${JSON.stringify(expRow)}, observed ${JSON.stringify(obsRow)}`,
      };
    }
  }
  return { equal: true, diff: "" };
}

function compareUnordered(expected: readonly Row[], observed: readonly Row[]): CompareResult {
  const unmatched = new Set(observed.map((_, i) => i));
  for (const expRow of expected) {
    const matchedIdx = Array.from(unmatched).find((idx) => {
      const obsRow = observed[idx];
      return obsRow !== undefined && areRowsEqual(expRow, obsRow);
    });
    if (matchedIdx === undefined) {
      const remaining = Array.from(unmatched)
        .map((idx) => JSON.stringify(observed[idx]))
        .join(", ");
      return {
        equal: false,
        diff: `Missing expected row: ${JSON.stringify(expRow)}${remaining ? `; unmatched observed: ${remaining}` : ""}`,
      };
    }
    unmatched.delete(matchedIdx);
  }
  return { equal: true, diff: "" };
}

export function compareRows(
  expected: readonly Row[],
  observed: readonly Row[],
  options?: CompareOptions,
): CompareResult {
  if (expected.length !== observed.length) {
    return {
      equal: false,
      diff: `Expected ${String(expected.length)} rows, observed ${String(observed.length)} rows`,
    };
  }
  return options?.ordered
    ? compareOrdered(expected, observed)
    : compareUnordered(expected, observed);
}
