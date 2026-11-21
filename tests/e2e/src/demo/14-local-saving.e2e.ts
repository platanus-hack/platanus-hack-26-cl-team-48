import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  addNodeFromLibrary,
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
  waitForEngineReady,
} from "../support/canvas.ts";
import { dropCsvOnCanvas } from "../support/csv-drop.ts";
import { openEmptyApp } from "../support/flow-files.ts";
import { showPreview } from "../support/preview.ts";

test("restores local flows and reconnects a saved CSV after reload", async ({ page }, testInfo) => {
  await openEmptyApp(page);
  await addNodeFromLibrary(page, "Datos de ejemplo");
  await addNodeFromLibrary(page, "Filtrar");
  await page.getByRole("textbox", { name: "Nombre del flujo" }).fill("Ventas locales");
  await expect(
    page.getByRole("status", { name: "" }).filter({ hasText: /^Guardado$/ }),
  ).toBeVisible();

  await page.reload();
  await waitForEngineReady(page);
  await expect(page.getByRole("textbox", { name: "Nombre del flujo" })).toHaveValue(
    "Ventas locales",
  );
  await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
  await expect(nodeOnCanvas(page, "Filtrar")).toBeVisible();
  await page.getByRole("button", { name: "Mis flujos" }).click();
  await page.getByRole("button", { name: "Nuevo flujo" }).click();
  await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveCount(0);
  await page.getByRole("button", { name: "Mis flujos" }).click();
  await page
    .getByRole("article", { name: "Ventas locales" })
    .getByRole("button", { name: "Abrir", exact: true })
    .click();
  await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();

  await page.getByRole("button", { name: "Mis flujos" }).click();
  await page.getByRole("button", { name: "Nuevo flujo" }).click();
  const path = testInfo.outputPath("ventas.csv");
  await writeFile(path, "producto,stock\nTé,12\nCafé,7\n");
  await dropCsvOnCanvas(page, { name: "ventas.csv", path });
  await page.getByRole("textbox", { name: "Nombre del flujo" }).fill("CSV local");
  await expect(page.getByRole("status").filter({ hasText: /^Guardado$/ })).toBeVisible();
  await page.reload();
  await waitForEngineReady(page);
  // Reconnection increments the revision and schedules a new save.
  await expect(page.getByRole("status").filter({ hasText: /^Guardando…$/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Guardado$/ })).toBeVisible();
  await runButton(page).click();
  await waitForAllNodesReady(page, 1);
  const preview = await showPreview(page, "ventas.csv", ["producto", "stock"]);
  expect(preview.rows).toEqual([
    ["Té", "12"],
    ["Café", "7"],
  ]);
});
