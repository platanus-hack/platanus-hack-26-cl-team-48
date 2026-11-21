import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  addNodeFromLibrary,
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
} from "../support/canvas.ts";
import { dropCsvOnCanvas } from "../support/csv-drop.ts";
import { openEmptyApp } from "../support/flow-files.ts";
import { showPreview } from "../support/preview.ts";
import { SALES_COLUMNS, salesRowCount } from "../support/sample-sales.ts";

// The panel pages through a result 100 rows at a time.
const PREVIEW_PAGE_ROWS = 100;

test.describe("step 1: a source node with its preview", () => {
  test("adds the sample sales data and previews its 200 rows", async ({ page }) => {
    await openEmptyApp(page);

    await addNodeFromLibrary(page, "Datos de ejemplo");
    await runButton(page).click();

    await waitForAllNodesReady(page, 1);
    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toContainText("200 filas · 5 col.");
    const preview = await showPreview(page, "Datos de ejemplo", SALES_COLUMNS);
    expect(preview.summary).toBe(`${String(salesRowCount())} filas · 5 col.`);
    expect(preview.rows).toHaveLength(PREVIEW_PAGE_ROWS);
    expect(preview.rows[0]).toEqual(["2024-01-01", "Sur", "Té", "20", "7,61"]);
  });

  test("turns a dropped CSV file into a source node with its preview", async ({
    page,
  }, testInfo) => {
    const path = testInfo.outputPath("inventario.csv");
    await writeFile(path, "producto,stock\nTé,12\nCafé,7\nCacao,3\n");
    await openEmptyApp(page);

    await dropCsvOnCanvas(page, { name: "inventario.csv", path });
    await expect(nodeOnCanvas(page, "inventario.csv")).toBeVisible();
    await runButton(page).click();

    await waitForAllNodesReady(page, 1);
    const preview = await showPreview(page, "inventario.csv", ["producto", "stock"]);
    expect(preview.rows).toEqual([
      ["Té", "12"],
      ["Café", "7"],
      ["Cacao", "3"],
    ]);
  });
});
