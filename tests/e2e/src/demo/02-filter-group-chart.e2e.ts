import { expect, test, type Page } from "@playwright/test";
import {
  addNodeFromLibrary,
  connectNodes,
  moveNodeBy,
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
  waitForFlowInEngine,
} from "../support/canvas.ts";
import { DEMO_MIN_UNITS, salesDemoFlow } from "../support/demo-flows.ts";
import { importFlow, openEmptyApp } from "../support/flow-files.ts";
import { parseDisplayedNumber } from "../support/displayed-number.ts";
import { previewOf, readRegionTotals, showPreview } from "../support/preview.ts";
import { SALES_COLUMNS, salesAbove, salesTotalsAbove } from "../support/sample-sales.ts";

const DEMO_NODE_COUNT = salesDemoFlow().nodes.length;

// New nodes land on top of the previous one; this moves the second one clear of the first.
const NODE_SPACING = { x: 0, y: 320 } as const;

// Inference answers in well under a second once the engine has the flow.
const COLUMN_INFERENCE_TIMEOUT = 10_000;

const parametersOf = (page: Page) => page.getByRole("complementary", { name: "Parámetros" });

/** Opens a column dropdown of the selected node and returns the columns it offers. */
async function columnOptions(page: Page, field: string): Promise<string[]> {
  await parametersOf(page).getByRole("button", { name: field }).click();
  const options = parametersOf(page).getByRole("listbox").getByRole("option");
  await expect(options.first()).toBeVisible({ timeout: COLUMN_INFERENCE_TIMEOUT });
  return options.allInnerTexts();
}

test.describe("step 2: filter, group and chart", () => {
  test("offers the input columns of a new connection before running", async ({ page }) => {
    await openEmptyApp(page);
    await addNodeFromLibrary(page, "Datos de ejemplo");
    await addNodeFromLibrary(page, "Filtrar");
    await moveNodeBy(page, "Filtrar", NODE_SPACING);

    await connectNodes(page, "Datos de ejemplo", "Filtrar");
    await expect(nodeOnCanvas(page, "Filtrar")).not.toContainText('Conecta la entrada "in"');
    await nodeOnCanvas(page, "Filtrar").click();

    expect(await columnOptions(page, "Columna")).toEqual([...SALES_COLUMNS]);
  });

  test("offers the grouped columns on the chart axes of an imported flow before running", async ({
    page,
  }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("ventas.nodo.json"));
    await waitForFlowInEngine(page, DEMO_NODE_COUNT);

    await nodeOnCanvas(page, "Gráfico de barras").click();

    expect(await columnOptions(page, "Eje X")).toEqual(["region", "total"]);
  });

  test("offers the chart axes when the chart is opened right after importing", async ({
    page,
  }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("ventas.nodo.json"));

    await nodeOnCanvas(page, "Gráfico de barras").click();

    expect(await columnOptions(page, "Eje X")).toEqual(["region", "total"]);
  });

  test("previews every step after running", async ({ page }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("ventas.nodo.json"));

    await runButton(page).click();
    await waitForAllNodesReady(page, DEMO_NODE_COUNT);

    const filtered = await showPreview(page, "Filtrar", SALES_COLUMNS);
    expect(filtered.summary).toBe(`${String(salesAbove(DEMO_MIN_UNITS))} filas · 5 col.`);
    expect(filtered.rows.every((row) => parseDisplayedNumber(row[3] ?? "") > DEMO_MIN_UNITS)).toBe(
      true,
    );
    expect(await readRegionTotals(page, "Agrupar")).toEqual(salesTotalsAbove(DEMO_MIN_UNITS));
    await nodeOnCanvas(page, "Gráfico de barras").click();
    await previewOf(page).getByRole("tab", { name: "Gráfico" }).click();
    await expect(previewOf(page).locator("canvas, svg").first()).toBeVisible();
  });
});
