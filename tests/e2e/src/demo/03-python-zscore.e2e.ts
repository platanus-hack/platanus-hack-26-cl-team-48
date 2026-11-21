import { expect, test } from "@playwright/test";
import { runButton, waitForAllNodesReady } from "../support/canvas.ts";
import { salesDemoFlow } from "../support/demo-flows.ts";
import { parseDisplayedNumber } from "../support/displayed-number.ts";
import { importFlow, openEmptyApp } from "../support/flow-files.ts";
import { columnOf, showPreview } from "../support/preview.ts";
import { SALES_COLUMNS, salesPriceZScores } from "../support/sample-sales.ts";

// The grid shows at most three decimals, so half a thousandth is the rounding error.
const DISPLAY_TOLERANCE = 0.0005;

test.describe("step 3: a Python node", () => {
  test("adds the z-score of the price computed by Python", async ({ page }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("ventas.nodo.json"));

    await runButton(page).click();
    await waitForAllNodesReady(page, salesDemoFlow().nodes.length);

    const preview = await showPreview(page, "Puntaje Z", [...SALES_COLUMNS, "zscore"]);
    const expected = salesPriceZScores();
    const shown = columnOf(preview, "zscore").map(parseDisplayedNumber);
    expect(shown.length).toBeGreaterThan(0);
    shown.forEach((value, index) => {
      expect(Math.abs(value - (expected[index] ?? Number.NaN))).toBeLessThanOrEqual(
        DISPLAY_TOLERANCE,
      );
    });
  });
});
