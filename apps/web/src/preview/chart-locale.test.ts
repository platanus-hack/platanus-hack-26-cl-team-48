import { parse, View } from "vega";
import { expect, it } from "vitest";
import { CHART_LOCALE } from "./chart-locale.ts";

async function formatWithChartLocale(expression: string) {
  const view = new View(
    parse(
      { signals: [{ name: "formatted", update: expression }] },
      { locale: { number: CHART_LOCALE.formatLocale, time: CHART_LOCALE.timeFormatLocale } },
    ),
    { renderer: "none" },
  );
  await view.runAsync();
  const formatted: unknown = view.signal("formatted");
  view.finalize();
  return formatted;
}

it("writes chart numbers with Spanish separators", async () => {
  expect(await formatWithChartLocale("format(1200.5, ',.2f')")).toBe("1.200,50");
});

it.each([
  ["%B", "febrero"],
  ["%b", "feb"],
  ["%A", "lunes"],
])("names dates in Spanish on time axes (%s)", async (pattern, expected) => {
  expect(await formatWithChartLocale(`timeFormat(datetime(2024, 1, 5), '${pattern}')`)).toBe(
    expected,
  );
});
