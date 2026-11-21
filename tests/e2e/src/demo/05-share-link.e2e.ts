import { expect, test } from "@playwright/test";
import { APP_ORIGIN } from "../support/app-origin.ts";
import {
  nodeStateLabels,
  runButton,
  waitForAllNodesReady,
  waitForEngineReady,
} from "../support/canvas.ts";
import { DEMO_MIN_UNITS, salesDemoFlow } from "../support/demo-flows.ts";
import { importFlow, openEmptyApp } from "../support/flow-files.ts";
import { readRegionTotals } from "../support/preview.ts";
import { salesTotalsAbove } from "../support/sample-sales.ts";

const DEMO_NODE_COUNT = salesDemoFlow().nodes.length;

test.describe("step 5: share by link", () => {
  test("opens the shared link in a fresh browser already run with the same flow", async ({
    browser,
    context,
    page,
  }, testInfo) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: APP_ORIGIN });
    await openEmptyApp(page);
    await importFlow(page, salesDemoFlow(), testInfo.outputPath("ventas.nodo.json"));
    await runButton(page).click();
    await waitForAllNodesReady(page, DEMO_NODE_COUNT);

    await page.getByRole("button", { name: "Compartir" }).click();
    await page
      .getByRole("menu", { name: "Compartir" })
      .getByRole("menuitem", { name: "Copiar enlace" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Enlace listo para compartir" }),
    ).toContainText("Copiamos el enlace del flujo al portapapeles.");
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link.startsWith(`${APP_ORIGIN}/#flow=`)).toBe(true);
    // A new context shares no storage, cookies or engine with the first one, like a private window.
    const incognito = await browser.newContext();
    const shared = await incognito.newPage();
    await shared.goto(link);
    await waitForEngineReady(shared);

    await waitForAllNodesReady(shared, DEMO_NODE_COUNT);
    expect(await nodeStateLabels(shared)).toEqual(await nodeStateLabels(page));
    expect(await readRegionTotals(shared, "Agrupar")).toEqual(salesTotalsAbove(DEMO_MIN_UNITS));
    await incognito.close();
  });
});
