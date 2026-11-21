import { expect, test, type Page } from "@playwright/test";
import {
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
  waitForFlowInEngine,
} from "../support/canvas.ts";
import { salesDemoFlow } from "../support/demo-flows.ts";
import { importFlow, openEmptyApp, openSharedFlow } from "../support/flow-files.ts";
import { openPreviewPanel, previewOf } from "../support/preview.ts";

const FIT_TOLERANCE = 1;
const SMALL_VIEWPORT = { width: 1100, height: 760 };

async function expectChartFits(page: Page) {
  const chart = previewOf(page).getByRole("img", { name: "Gráfico" });
  const panel = previewOf(page).getByRole("tabpanel");
  await expect
    .poll(async () => {
      const drawing = await chart.locator("svg.marks").boundingBox();
      const available = await panel.boundingBox();
      return (
        drawing !== null &&
        available !== null &&
        drawing.width > 0 &&
        drawing.height > 0 &&
        drawing.x >= available.x - FIT_TOLERANCE &&
        drawing.y >= available.y - FIT_TOLERANCE &&
        drawing.x + drawing.width <= available.x + available.width + FIT_TOLERANCE &&
        drawing.y + drawing.height <= available.y + available.height + FIT_TOLERANCE
      );
    })
    .toBe(true);
}

test.describe("node actions and interactive charts", () => {
  test("keeps the charts that already ran when another node runs", async ({ page }) => {
    const nodeCount = salesDemoFlow().nodes.length;
    await openSharedFlow(page, salesDemoFlow());
    await waitForAllNodesReady(page, nodeCount);
    const chart = nodeOnCanvas(page, "Gráfico de barras").locator(".web-interactive-chart");
    await expect(chart).toBeVisible();

    await nodeOnCanvas(page, "Filtrar").click();
    await page
      .getByRole("toolbar", { name: "Acciones del nodo" })
      .getByRole("button", { name: "Ejecutar este nodo" })
      .click();
    await waitForAllNodesReady(page, nodeCount);
    await expect(chart).toBeVisible();
  });

  test("runs only the selected node and its dependencies from its toolbar", async ({
    page,
  }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("target.nodo.json"));
    await waitForFlowInEngine(page, salesDemoFlow().nodes.length);
    await nodeOnCanvas(page, "Filtrar").click();
    await page
      .getByRole("toolbar", { name: "Acciones del nodo" })
      .getByRole("button", { name: "Ejecutar este nodo" })
      .click();
    await expect(nodeOnCanvas(page, "Filtrar")).toHaveAccessibleName(/, Listo/);
    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveAccessibleName(/, Listo/);
    for (const title of ["Agrupar", "Gráfico de barras", "Puntaje Z"]) {
      await expect(nodeOnCanvas(page, title)).toHaveAccessibleName(
        /, (Sin ejecutar|Desactualizado)$/,
      );
    }
  });

  test("shows results and navigates, closes and executes menu actions", async ({
    page,
  }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("actions.nodo.json"));
    await runButton(page).click();
    await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
    await nodeOnCanvas(page, "Agrupar").click();
    const toolbar = page.getByRole("toolbar", { name: "Acciones del nodo" });

    await toolbar.getByRole("button", { name: "Ver resultado" }).click();
    await expect(previewOf(page).getByRole("table")).toBeVisible();
    const more = toolbar.getByRole("button", { name: "Más acciones" });
    await more.click();
    await expect(page.getByRole("menuitem", { name: "Duplicar nodo" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Eliminar nodo" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(more).toBeFocused();
    await more.click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(nodeOnCanvas(page, "Agrupar")).toHaveCount(0);
  });

  test("shows values on hover and fits the panel after resizing", async ({ page }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("chart.nodo.json"));
    await runButton(page).click();
    await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
    await openPreviewPanel(page);
    await nodeOnCanvas(page, "Gráfico de barras").click();
    await previewOf(page).getByRole("tab", { name: "Gráfico" }).click();
    const chart = previewOf(page).getByRole("img", { name: "Gráfico" });
    const header = previewOf(page).locator("header");
    await expect(header).toHaveCount(1);
    await expect(header.getByRole("heading", { name: "Vista previa" })).toBeVisible();
    await expect(header.getByRole("tab", { name: "Gráfico" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Ampliar vista previa" })).toBeVisible();

    await chart.locator(".mark-rect.role-mark path").first().hover();
    await expect(page.locator("#vg-tooltip-element")).toBeVisible();
    await expect(page.locator("#vg-tooltip-element")).toContainText("total");
    await expectChartFits(page);
    await page.setViewportSize(SMALL_VIEWPORT);
    await expectChartFits(page);
  });
  test("exports SVG and PNG from a closed app menu", async ({ page }, testInfo) => {
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("export.nodo.json"));
    await runButton(page).click();
    await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
    await openPreviewPanel(page);
    await nodeOnCanvas(page, "Gráfico de barras").click();
    const preview = previewOf(page);
    await expect(preview.getByRole("menu")).toHaveCount(0);
    await expect(preview.locator(".vega-actions")).toHaveCount(0);

    for (const format of ["SVG", "PNG"]) {
      await preview.getByRole("button", { name: "Exportar gráfico" }).click();
      const download = page.waitForEvent("download");
      await preview.getByRole("menuitem", { name: `Guardar como ${format}` }).click();
      const exported = await download;
      expect(exported.suggestedFilename()).toBe(`grafico.${format.toLowerCase()}`);
      await exported.saveAs(testInfo.outputPath(exported.suggestedFilename()));
      expect(await exported.failure()).toBeNull();
      await expect(preview.getByRole("menu")).toHaveCount(0);
    }
  });
});
