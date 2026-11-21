// The design system writes numbers in the user's region format; Spanish is the default locale.
const LOCALE = "es";
const PERCENT_FRACTION_DIGITS = 1;

const integerFormat = new Intl.NumberFormat(LOCALE, { useGrouping: "always" });
const percentFormat = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: PERCENT_FRACTION_DIGITS,
});

export function formatNumber(value: number): string {
  return integerFormat.format(value);
}

export function formatPercent(ratio: number): string {
  return percentFormat.format(ratio);
}
