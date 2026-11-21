import { expect, test, type Locator, type Page } from "@playwright/test";
import { canvasOf, nodeOnCanvas, waitForAllNodesReady } from "./support/canvas.ts";
import { pythonCodeFlow, salesDemoFlow, sampleOnlyFlow } from "./support/demo-flows.ts";
import { openSharedFlow } from "./support/flow-files.ts";
import { openEmptyApp } from "./support/flow-files.ts";
import { openPreviewPanel, previewOf } from "./support/preview.ts";
import { railButton, railOf, sidePanelOf } from "./support/side-panel.ts";

// A node shows this many rows of its result, plus the header row.
const IN_NODE_ROWS = 6;

test("resizes the preview by dragging and keyboard and remembers its size", async ({ page }) => {
  await openEmptyApp(page);
  await openPreviewPanel(page);
  const separator = page.getByRole("separator", { name: "Redimensionar vista previa" });
  const bounds = await separator.boundingBox();
  if (bounds === null) throw new Error("The preview separator must be visible");
  const before = Number(await separator.getAttribute("aria-valuenow"));
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y - 70, { steps: 8 });
  await page.mouse.up();
  const dragged = Number(await separator.getAttribute("aria-valuenow"));
  expect(dragged).toBeGreaterThan(before);
  await separator.focus();
  await page.keyboard.press("ArrowDown");
  await expect(separator).toHaveAttribute("aria-valuenow", String(dragged - 5));
  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", String(dragged - 5));
});

async function dragBy(page: Page, handle: Locator, offset: { x: number; y: number }) {
  const bounds = await handle.boundingBox();
  if (bounds === null) throw new Error("The handle must be visible");
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + offset.x, center.y + offset.y, { steps: 8 });
  await page.mouse.up();
}

test("widens the parameters and lengthens the code editor, and remembers both", async ({
  page,
}) => {
  await openSharedFlow(page, pythonCodeFlow("def transform(inputs):\n    return inputs\n"));
  await nodeOnCanvas(page, "Código Python").locator(".web-node-title").click();
  const params = page.getByRole("complementary", { name: "Parámetros" });
  const editor = params.locator(".web-code-box");
  const paramsBefore = (await params.boundingBox())?.width ?? 0;
  const editorBefore = (await editor.boundingBox())?.height ?? 0;

  await dragBy(page, page.getByRole("separator", { name: "Redimensionar parámetros" }), {
    x: -140,
    y: 0,
  });
  await dragBy(page, page.getByRole("separator", { name: "Redimensionar editor de código" }), {
    x: 0,
    y: 120,
  });
  const paramsAfter = (await params.boundingBox())?.width ?? 0;
  const editorAfter = (await editor.boundingBox())?.height ?? 0;
  expect(paramsAfter).toBeGreaterThan(paramsBefore + 100);
  expect(editorAfter).toBeGreaterThan(editorBefore + 80);

  await page.reload();
  await nodeOnCanvas(page, "Código Python").locator(".web-node-title").click();
  await expect.poll(async () => (await params.boundingBox())?.width).toBeCloseTo(paramsAfter, 0);
  await expect.poll(async () => (await editor.boundingBox())?.height).toBeCloseTo(editorAfter, 0);
});

test("shows previews in the nodes by default and moves them to a panel", async ({ page }) => {
  await openEmptyApp(page);
  await expect(page.getByRole("button", { name: "En nodos", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(previewOf(page)).toHaveCount(0);
  await openPreviewPanel(page);
  const initial = await previewOf(page).boundingBox();
  await page.getByRole("button", { name: "Ampliar vista previa" }).click();
  const maximized = await previewOf(page).boundingBox();
  expect(maximized?.height).toBeGreaterThan(initial?.height ?? 0);
  await expect(page.getByRole("separator", { name: "Redimensionar vista previa" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reducir vista previa" }).click();
  await expect(page.getByRole("separator", { name: "Redimensionar vista previa" })).toBeVisible();
  await page.reload();
  await expect(previewOf(page)).toBeVisible();
});

test("previews a node's rows, profile and chart inside the node", async ({ page }) => {
  await openSharedFlow(page, salesDemoFlow());
  await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
  const source = nodeOnCanvas(page, "Datos de ejemplo");
  await expect(source.getByRole("table").getByRole("row")).toHaveCount(IN_NODE_ROWS + 1);
  await expect(source.getByText("6 de 200 filas")).toBeVisible();
  await source.getByRole("button", { name: "Perfil" }).click();
  await expect(source.getByText("Calculado sobre 200 filas")).toBeVisible();
  const chart = nodeOnCanvas(page, "Gráfico de barras");
  await expect(chart.getByRole("img", { name: "Gráfico" }).locator("svg.marks")).toBeVisible();
  await expect(chart.getByRole("button", { name: "Exportar gráfico" })).toHaveCount(0);
  await chart.getByRole("button", { name: "Abrir gráfico" }).click();
  await expect(previewOf(page).getByRole("img", { name: "Gráfico" })).toBeVisible();
});

test("moves apart the nodes that their previews make overlap", async ({ page }) => {
  await openSharedFlow(page, salesDemoFlow());
  await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
  await expect(nodeOnCanvas(page, "Gráfico de barras").locator("svg.marks")).toBeVisible();
  const boxes = await canvasOf(page)
    .locator(".web-node")
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect));
  const overlaps = boxes.flatMap((a, index) =>
    boxes
      .slice(index + 1)
      .filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom),
  );
  expect(overlaps).toEqual([]);
});

test("labels each connection with the size of the table it carries", async ({ page }) => {
  await openSharedFlow(page, salesDemoFlow());
  await waitForAllNodesReady(page, salesDemoFlow().nodes.length);
  await expect(canvasOf(page).getByTitle("Tabla de 200 filas y 5 columnas")).toHaveCount(2);
});

test("hides and restores the library and parameters across reloads", async ({ page }) => {
  await openEmptyApp(page);
  await sidePanelOf(page, "Nodos").getByRole("button", { name: "Ocultar panel" }).click();
  await page.getByRole("button", { name: "Ocultar parámetros" }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar nodos" })).toHaveCount(0);
  await expect(railButton(page, "Nodos")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name: "Parámetros" })).toHaveCount(0);
  await page.reload();
  await expect(sidePanelOf(page, "Nodos")).toHaveCount(0);
  await railButton(page, "Nodos").click();
  await page.getByRole("button", { name: "Mostrar parámetros" }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar nodos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parámetros" })).toBeVisible();
});

test("hides the library by choosing Nodos again in the rail", async ({ page }) => {
  await openEmptyApp(page);
  await expect(railButton(page, "Nodos")).toHaveAttribute("aria-pressed", "true");
  await railButton(page, "Nodos").click();
  await expect(sidePanelOf(page, "Nodos")).toHaveCount(0);
  await railButton(page, "Nodos").click();
  await expect(sidePanelOf(page, "Nodos")).toBeVisible();
});

test("applies token colors, persists explicit themes and follows the system", async ({ page }) => {
  await openEmptyApp(page);
  const theme = railOf(page).getByRole("button", { name: "Tema", exact: true });
  await theme.click();
  await page.getByRole("menuitemradio", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const light = await page
    .locator("body")
    .evaluate((body) => getComputedStyle(body).backgroundColor);
  await theme.click();
  await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor))
    .not.toBe(light);
  await page.reload();
  await theme.click();
  await expect(page.getByRole("menuitemradio", { name: "Oscuro" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.click();
  await page.getByRole("menuitemradio", { name: "Sistema" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", light);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect
    .poll(() => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor))
    .not.toBe(light);
  await expect(page.getByRole("link", { name: "React Flow" })).toHaveCount(0);
  await expect(page.locator(".react-flow__attribution")).toHaveCount(0);
});

test("uses icon controls, a styled search field and a preview location control", async ({
  page,
}) => {
  await openEmptyApp(page);
  for (const name of [
    "Deshacer",
    "Rehacer",
    "Tema",
    "Alejar",
    "Acercar",
    "Ajustar a la pantalla",
  ]) {
    const control = page.getByRole("button", { name, exact: true });
    await expect(control).toHaveAttribute("title", name);
    await expect(control.locator("svg")).toHaveCount(1);
    await expect(control).toHaveText("");
  }
  const search = page.getByRole("searchbox", { name: "Buscar nodos" });
  const searchHeight = await search.evaluate((element) => element.getBoundingClientRect().height);
  const controlHeight = await search.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue("--control-md")),
  );
  expect(searchHeight).toBeGreaterThanOrEqual(controlHeight - 2);
  await expect(page.getByRole("group", { name: "Dónde se muestra la vista previa" })).toBeVisible();
});

test("opens a shared flow at a readable zoom and shows one engine badge label", async ({
  page,
}) => {
  await openSharedFlow(page, sampleOnlyFlow());
  const zoom = page.getByRole("group", { name: "Zoom del lienzo" }).getByText(/%$/);
  await expect.poll(async () => Number.parseInt(await zoom.innerText())).toBeGreaterThanOrEqual(85);
  await expect(
    page
      .getByRole("banner", { name: "Acciones del flujo" })
      .getByRole("img", { name: "Navegador" }),
  ).toHaveCount(1);
});
