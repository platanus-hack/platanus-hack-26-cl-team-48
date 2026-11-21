import { expect, test, type Page } from "@playwright/test";
import { canvasOf, nodeOnCanvas, runButton, waitForAllNodesReady } from "../support/canvas.ts";
import { castThenLineFlow, lineChartFlow, pythonContractFlow } from "../support/demo-flows.ts";
import { openSharedFlow } from "../support/flow-files.ts";

const LINE = "Gráfico de líneas";
const CODE = "Código Python";
const PASSES_THROUGH = 'def transform(inputs):\n    return {"out": inputs["in"]}\n';

const paramsPanel = (page: Page) => page.getByRole("complementary", { name: "Parámetros" });

const dateGrouping = (page: Page) =>
  paramsPanel(page).getByRole("combobox", { name: /Agrupar fechas por/ });

async function selectNode(page: Page, title: string): Promise<void> {
  await nodeOnCanvas(page, title).locator(".web-node-title").click();
}

async function chooseColumn(page: Page, field: string, column: string): Promise<void> {
  await paramsPanel(page).getByRole("button", { name: field, exact: true }).click();
  await paramsPanel(page)
    .getByRole("option", { name: new RegExp(`^${column}`) })
    .click();
}

test.describe("params that depend on column types", () => {
  test("groups dates only while X is a date, and offers Y only number columns", async ({
    page,
  }) => {
    await openSharedFlow(page, lineChartFlow({ x: "fecha", y: "unidades" }));
    await waitForAllNodesReady(page, 2);
    await selectNode(page, LINE);

    await expect(dateGrouping(page)).toHaveValue("yearmonth");
    await dateGrouping(page).selectOption({ label: "Sin agrupar" });
    await runButton(page).click();
    await waitForAllNodesReady(page, 2);
    await expect(nodeOnCanvas(page, LINE).locator(".web-interactive-chart")).toBeVisible();

    await chooseColumn(page, "Eje X", "unidades");
    await expect(dateGrouping(page)).toHaveCount(0);
    await paramsPanel(page).getByRole("button", { name: "Eje Y", exact: true }).click();
    await expect(paramsPanel(page).getByRole("option", { name: /^region/ })).toBeDisabled();
    await expect(paramsPanel(page).getByRole("option", { name: /^precio/ })).toBeEnabled();
  });

  test("converts a column to text and reports it where a number is expected", async ({ page }) => {
    await openSharedFlow(page, castThenLineFlow([{ column: "unidades", to: "text" }]));

    await expect(nodeOnCanvas(page, LINE)).toHaveAccessibleName(`${LINE}, Error`);
    await expect(canvasOf(page).locator(".web-node-note")).toContainText(
      'La columna "unidades" es texto; aquí se espera número',
    );
    await selectNode(page, LINE);
    await expect(paramsPanel(page).getByRole("alert")).toContainText(
      'La columna "unidades" es texto; aquí se espera número',
    );
  });
});

test.describe("output contract of code nodes", () => {
  test("fails a code node whose result lacks a declared column", async ({ page }) => {
    await openSharedFlow(
      page,
      pythonContractFlow(PASSES_THROUGH, { columns: [{ name: "total", type: "number" }] }),
    );

    await expect(nodeOnCanvas(page, CODE)).toHaveAccessibleName(`${CODE}, Error`);
    await expect(canvasOf(page).locator(".web-node-note")).toContainText(
      'El resultado no tiene la columna "total"',
    );
  });

  test("fails a code node that had to show a figure and showed none", async ({ page }) => {
    await openSharedFlow(page, pythonContractFlow(PASSES_THROUGH, { mustShow: true }));

    await expect(canvasOf(page).locator(".web-node-note")).toContainText(
      "El nodo no mostró ningún gráfico",
    );
  });

  test("copies the columns of the last result into the declaration", async ({ page }) => {
    await openSharedFlow(page, pythonContractFlow(PASSES_THROUGH, {}));
    await waitForAllNodesReady(page, 2);
    await selectNode(page, CODE);

    const declared = paramsPanel(page).getByRole("group", { name: "Columnas de salida" });
    await declared.getByRole("button", { name: "Copiar del último resultado" }).click();

    await expect(declared.getByRole("textbox", { name: "Nombre" })).toHaveCount(5);
    await expect(declared.getByRole("textbox", { name: "Nombre" }).first()).toHaveValue("fecha");
  });
});
