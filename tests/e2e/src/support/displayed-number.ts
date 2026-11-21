const GROUPING = /\./g;
const MINUS_SIGN = /−/g;

/** Reads a number as the data grid shows it: Spanish format, "." groups thousands and "," is the decimal mark. */
export function parseDisplayedNumber(text: string): number {
  const value = Number(
    text.trim().replace(GROUPING, "").replace(",", ".").replace(MINUS_SIGN, "-"),
  );
  if (Number.isNaN(value)) throw new Error(`Not a displayed number: "${text}"`);
  return value;
}
