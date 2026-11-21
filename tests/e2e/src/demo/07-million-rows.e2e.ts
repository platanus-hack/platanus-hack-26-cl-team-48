import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import {
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
  waitForFlowInEngine,
} from "../support/canvas.ts";
import { dropCsvOnCanvas } from "../support/csv-drop.ts";
import { filterAndGroupFlow, firstNodeOf } from "../support/demo-flows.ts";
import { exportFlow, importFlow, openEmptyApp } from "../support/flow-files.ts";
import { describeMillionRows } from "../support/million-rows.ts";
import { readRegionTotals } from "../support/preview.ts";

const ROW_COUNT = 1_000_000;
const MIN_UNITS = 20;
const BUDGET_MS = 3000;
const FILE_NAME = "ventas-millon.csv";
const FLOW_NODE_COUNT = 3;

/** Milliseconds from clicking "Ejecutar" until every node shows "Listo". */
async function timeRun(page: Page): Promise<number> {
  const startedAt = Date.now();
  await runButton(page).click();
  await waitForAllNodesReady(page, FLOW_NODE_COUNT);
  return Date.now() - startedAt;
}

test.describe("step 7: one million rows in the browser", () => {
  test("filters and groups 1M rows in under 3 seconds", async ({ page }, testInfo) => {
    const million = describeMillionRows({ rowCount: ROW_COUNT, minUnits: MIN_UNITS });
    const csvPath = testInfo.outputPath(FILE_NAME);
    await writeFile(csvPath, million.csv);
    await openEmptyApp(page);
    await dropCsvOnCanvas(page, { name: FILE_NAME, path: csvPath });
    await expect(nodeOnCanvas(page, FILE_NAME)).toBeVisible();
    const exported = await exportFlow(page, testInfo.outputPath("fuente.nodo.json"));
    await importFlow(
      page,
      filterAndGroupFlow(firstNodeOf(exported.flow), MIN_UNITS),
      testInfo.outputPath("millon.nodo.json"),
    );
    await waitForFlowInEngine(page, FLOW_NODE_COUNT);

    const elapsed = await timeRun(page);

    testInfo.annotations.push({ type: "1M rows run (ms)", description: String(elapsed) });
    expect(elapsed).toBeLessThan(BUDGET_MS);
    expect(await readRegionTotals(page, "Agrupar")).toEqual(million.expectedTotals);
  });
});
