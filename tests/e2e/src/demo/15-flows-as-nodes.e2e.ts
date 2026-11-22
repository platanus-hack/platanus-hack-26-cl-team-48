import { expect, test, type Page } from "@playwright/test";
import { signInLocally } from "../support/account.ts";
import {
  addNodeFromLibrary,
  connectNodes,
  moveNodeBy,
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
} from "../support/canvas.ts";
import {
  chooseFlowOption,
  exportFlow,
  importFlowFile,
  openEmptyApp,
} from "../support/flow-files.ts";
import { showPreview } from "../support/preview.ts";
import { showSidePanel } from "../support/side-panel.ts";
import { SALES_COLUMNS, salesAbove } from "../support/sample-sales.ts";

const NODE_NAME = "Ventas altas";
const ORIGINAL = "Definición de ventas";
const CONSUMER = "Ventas reutilizadas";
const MINIMUM = 20;
const NODE_SPACING = { x: 0, y: 200 };
const DEFINITION_OFFSETS = {
  entry: { x: 0, y: 120 },
  filter: { x: 0, y: 240 },
  output: { x: 0, y: 360 },
};
const parameters = (page: Page) => page.getByRole("complementary", { name: "Parámetros" });
const saved = (page: Page) => page.getByRole("status").filter({ hasText: /^Guardado$/ });

async function addSpacedNode(page: Page, name: string, offset = NODE_SPACING) {
  await addNodeFromLibrary(page, name);
  await moveNodeBy(page, name, offset);
}

async function chooseColumn(page: Page) {
  await parameters(page).getByRole("button", { name: "Columna", exact: true }).click();
  await parameters(page)
    .getByRole("option", { name: /^unidades/ })
    .click();
}

/** Opens a saved node flow from "Mis nodos"; the editor no longer lists every flow (ADR 0024). */
async function openNodeFlow(page: Page, name: string) {
  const nodes = await showSidePanel(page, "Mis nodos");
  await nodes
    .getByRole("article", { name, exact: true })
    .getByRole("button", { name: "Abrir flujo", exact: true })
    .click();
}

async function createDefinition(page: Page) {
  await page.getByRole("textbox", { name: "Nombre del flujo" }).fill(ORIGINAL);
  await addNodeFromLibrary(page, "Datos de ejemplo");
  await addSpacedNode(page, "Entrada de nodo", DEFINITION_OFFSETS.entry);
  await parameters(page)
    .getByRole("textbox", { name: "Nombre del nodo", exact: true })
    .fill(NODE_NAME);
  await parameters(page).getByRole("textbox", { name: "Nombre", exact: true }).fill("Ventas");
  await parameters(page).getByRole("combobox", { name: "Tipo", exact: true }).selectOption("table");
  await connectNodes(page, "Datos de ejemplo", "Entrada de nodo");
  await addSpacedNode(page, "Filtrar", DEFINITION_OFFSETS.filter);
  await connectNodes(page, "Entrada de nodo", "Filtrar");
  await chooseColumn(page);
  await parameters(page)
    .getByRole("combobox", { name: /^Operador/ })
    .selectOption(">");
  await parameters(page)
    .getByRole("textbox", { name: /^Valor/ })
    .fill("10");
  await parameters(page)
    .locator(".nd-field")
    .filter({ has: page.getByRole("textbox", { name: /^Valor/ }) })
    .getByRole("button", { name: "Exponer como parámetro del nodo" })
    .click();
  await addSpacedNode(page, "Salida de nodo", DEFINITION_OFFSETS.output);
  await connectNodes(page, "Filtrar", "Salida de nodo");
}

test("creates, reuses and explicitly updates a saved flow as a node", async ({
  page,
}, testInfo) => {
  await openEmptyApp(page);
  // Flows are saved only in the account (ADR 0023); without signing in nothing is saved.
  await signInLocally(page);
  await createDefinition(page);
  await runButton(page).click();
  await waitForAllNodesReady(page, 4);
  await expect(saved(page)).toBeVisible();
  await chooseFlowOption(page, "Nuevo flujo");
  await page.getByRole("textbox", { name: "Nombre del flujo" }).fill(CONSUMER);
  await addNodeFromLibrary(page, "Datos de ejemplo");
  await addSpacedNode(page, NODE_NAME);
  await connectNodes(page, "Datos de ejemplo", NODE_NAME);
  await parameters(page)
    .getByRole("textbox", { name: /^Valor/ })
    .fill(String(MINIMUM));
  await runButton(page).click();
  await waitForAllNodesReady(page, 2);
  expect((await showPreview(page, NODE_NAME, SALES_COLUMNS)).summary).toBe(
    `${String(salesAbove(MINIMUM))} filas · 5 col.`,
  );
  await expect(saved(page)).toBeVisible();
  // Mis flujos lives in the hub, which keeps the in-memory account only until the page reloads,
  // so the consumer comes back as a file once its node has a newer version.
  const consumer = await exportFlow(page, testInfo.outputPath("consumidor.nodo.json"));
  await openNodeFlow(page, ORIGINAL);
  await nodeOnCanvas(page, "Entrada de nodo").locator(".web-node-title").click();
  await parameters(page)
    .getByRole("textbox", { name: /^Descripción/ })
    .fill("Ventas filtradas por unidades");
  await expect(saved(page)).toBeVisible();
  await importFlowFile(page, consumer.path);
  await nodeOnCanvas(page, NODE_NAME).locator(".web-node-title").click();
  await page.getByRole("button", { name: "Actualizar a la versión 0.1.1" }).click();
  await runButton(page).click();
  await waitForAllNodesReady(page, 2);
  expect((await showPreview(page, NODE_NAME, SALES_COLUMNS)).summary).toBe(
    `${String(salesAbove(MINIMUM))} filas · 5 col.`,
  );
});
