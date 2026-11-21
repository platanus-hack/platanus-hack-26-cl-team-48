import { expect, type Page } from "@playwright/test";
import { canvasOf, nodeOnCanvas, runButton, waitForAllNodesReady } from "../support/canvas.ts";
import { salesDemoFlow } from "../support/demo-flows.ts";
import { openSharedFlow } from "../support/flow-files.ts";
import { isLocalEngineInstalled, LOCAL_ENGINE_MISSING } from "../support/local-engine.ts";
import { test } from "../support/local-engine-test.ts";
import { showPreview, type PreviewTable } from "../support/preview.ts";
import { SALES_COLUMNS } from "../support/sample-sales.ts";

const DEMO_NODE_COUNT = salesDemoFlow().nodes.length;

type DemoResults = { readonly totals: PreviewTable; readonly zscores: PreviewTable };

async function readDemoResults(page: Page): Promise<DemoResults> {
  return {
    totals: await showPreview(page, "Agrupar", ["region", "total"]),
    zscores: await showPreview(page, "Puntaje Z", [...SALES_COLUMNS, "zscore"]),
  };
}

/** Every node shows, with its engine icon, where it ran. */
const nodesRunOn = (page: Page, engine: string) =>
  canvasOf(page)
    .locator(".web-node")
    .filter({ has: page.getByRole("img", { name: engine }) });

test.describe("step 8: switch from the browser engine to the local Python engine", () => {
  test.skip(!isLocalEngineInstalled(), LOCAL_ENGINE_MISSING);

  test("runs the same flow on the local engine with the same results", async ({
    page,
    localEngine,
  }) => {
    await openSharedFlow(page, salesDemoFlow());
    await waitForAllNodesReady(page, DEMO_NODE_COUNT);
    const inBrowser = await readDemoResults(page);
    await expect(nodesRunOn(page, "Navegador")).toHaveCount(DEMO_NODE_COUNT);

    await page.getByRole("combobox", { name: "Motor" }).selectOption({ label: "Python local" });
    await page
      .getByRole("textbox", { name: "Dirección del motor local" })
      .fill(localEngine.address);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("banner").getByRole("img", { name: "Motor local" })).toBeVisible();
    await runButton(page).click();

    await waitForAllNodesReady(page, DEMO_NODE_COUNT);
    await expect(nodesRunOn(page, "Motor local")).toHaveCount(DEMO_NODE_COUNT);
    await expect(nodeOnCanvas(page, "Puntaje Z")).toHaveAccessibleName("Puntaje Z, Listo");
    expect(await readDemoResults(page)).toEqual(inBrowser);
  });
});
