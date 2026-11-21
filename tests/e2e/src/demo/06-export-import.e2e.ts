import { expect, test } from "@playwright/test";
import { nodeStateLabels, runButton, waitForAllNodesReady } from "../support/canvas.ts";
import { DEMO_MIN_UNITS, salesDemoFlow } from "../support/demo-flows.ts";
import { exportFlow, importFlowFile, openEmptyApp, openSharedFlow } from "../support/flow-files.ts";
import { readRegionTotals } from "../support/preview.ts";
import { salesTotalsAbove } from "../support/sample-sales.ts";

const DEMO_NODE_COUNT = salesDemoFlow().nodes.length;

test.describe("step 6: export and import a .nodo.json file", () => {
  test("imports in a new page the same flow it exported", async ({ context, page }, testInfo) => {
    await openSharedFlow(page, salesDemoFlow());
    await waitForAllNodesReady(page, DEMO_NODE_COUNT);

    const exported = await exportFlow(page, testInfo.outputPath("exportado.nodo.json"));
    const other = await context.newPage();
    await openEmptyApp(other);
    await importFlowFile(other, exported.path);
    await runButton(other).click();

    expect(exported.fileName).toMatch(/\.nodo\.json$/);
    expect(exported.flow).toMatchObject({
      nodes: salesDemoFlow().nodes.map(({ id, type, params }) => ({ id, type, params })),
      edges: salesDemoFlow().edges,
    });
    await waitForAllNodesReady(other, DEMO_NODE_COUNT);
    expect(await nodeStateLabels(other)).toEqual(await nodeStateLabels(page));
    expect(await readRegionTotals(other, "Agrupar")).toEqual(salesTotalsAbove(DEMO_MIN_UNITS));
  });
});
