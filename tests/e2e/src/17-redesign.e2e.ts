import { expect, test } from "@playwright/test";
import { canvasOf, nodeOnCanvas, waitForAllNodesReady } from "./support/canvas.ts";
import { sampleOnlyFlow } from "./support/demo-flows.ts";
import { openEmptyApp, openSharedFlow } from "./support/flow-files.ts";
import {
  railButton,
  railOf,
  showSidePanel,
  SIDE_SECTIONS,
  sidePanelOf,
} from "./support/side-panel.ts";

test("shows each section of the rail in the side panel and hides it again", async ({ page }) => {
  await openEmptyApp(page);
  for (const section of SIDE_SECTIONS) {
    const panel = await showSidePanel(page, section);
    await expect(railButton(page, section)).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByRole("heading", { level: 2 })).toBeVisible();
    await railButton(page, section).click();
    await expect(sidePanelOf(page, section)).toHaveCount(0);
    await expect(railButton(page, section)).toHaveAttribute("aria-pressed", "false");
  }
});

test("remembers the side section across reloads", async ({ page }) => {
  await openEmptyApp(page);
  await showSidePanel(page, "Datos");
  await page.reload();
  await expect(sidePanelOf(page, "Datos")).toBeVisible();
  await expect(railButton(page, "Datos")).toHaveAttribute("aria-pressed", "true");
});

test("shows the agent as a mockup that cannot act", async ({ page }) => {
  await openEmptyApp(page);
  const agent = await showSidePanel(page, "Agente");
  await expect(agent.getByText("Maqueta: el agente todavía no está conectado.")).toBeVisible();
  await expect(agent.getByRole("button", { name: "Aceptar" }).first()).toBeDisabled();
  await expect(agent.getByRole("button", { name: "Rechazar" }).first()).toBeDisabled();
  await expect(agent.getByRole("textbox", { name: "Escribe al agente" })).toBeDisabled();
  await expect(agent.getByText(/Trabaja en un borrador/)).toBeVisible();
  await expect(agent.getByRole("button", { name: "Ver en el lienzo" }).first()).toBeDisabled();
  await expect(agent.getByRole("button", { name: "Aceptar los 3" })).toBeDisabled();
  await expect(agent.getByRole("button", { name: "Descartar borrador" })).toBeDisabled();
});

test("shows a node's history as a mockup tab of the parameters", async ({ page }) => {
  await openSharedFlow(page, sampleOnlyFlow());
  await waitForAllNodesReady(page, 1);
  await nodeOnCanvas(page, "Datos de ejemplo").locator(".web-node-title").click();
  const params = page.getByRole("complementary", { name: "Parámetros" });
  const tabs = params.getByRole("tablist", { name: "Detalle del nodo" });
  await expect(tabs.getByRole("tab", { name: "Parámetros" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await tabs.getByRole("tab", { name: "Historia" }).click();
  await expect(
    params
      .getByRole("tabpanel")
      .getByText("Maqueta: aquí verás quién cambió este nodo, cuándo y por qué."),
  ).toBeVisible();
});

test("heads the parameters with the node's status and a way to run only that node", async ({
  page,
}) => {
  await openSharedFlow(page, sampleOnlyFlow());
  await waitForAllNodesReady(page, 1);
  await nodeOnCanvas(page, "Datos de ejemplo").locator(".web-node-title").click();
  const params = page.getByRole("complementary", { name: "Parámetros" });
  await expect(params.getByText(/^Listo/)).toBeVisible();
  await params.getByRole("button", { name: "Ejecutar este nodo" }).click();
  await expect(params.getByText(/^Listo/)).toBeVisible();
});

test("opens the hub in another tab with its own header", async ({ page }) => {
  await openEmptyApp(page);
  const [hub] = await Promise.all([
    page.context().waitForEvent("page"),
    railOf(page).getByRole("link", { name: "Abrir el hub en otra pestaña" }).click(),
  ]);
  await hub.waitForLoadState();
  expect(new URL(hub.url()).pathname).toBe("/hub");
  await expect(
    hub.getByRole("banner").getByRole("link", { name: "Abrir el editor" }),
  ).toBeVisible();
  await expect(hub.getByRole("heading", { name: "Para ti" })).toBeVisible();
  await expect(
    hub.getByText("Maqueta: recomendaciones según los flujos en los que trabajas."),
  ).toBeVisible();
  await expect(
    hub.getByRole("banner").getByRole("searchbox", { name: "Buscar en el hub" }),
  ).toBeVisible();
  await expect(hub.getByRole("complementary", { name: "Filtros del hub" })).toBeVisible();
  await expect(canvasOf(page)).toBeVisible();
});

test("keeps the hub tab on the theme chosen in the editor", async ({ page }) => {
  await openEmptyApp(page);
  const [hub] = await Promise.all([
    page.context().waitForEvent("page"),
    railOf(page).getByRole("link", { name: "Abrir el hub en otra pestaña" }).click(),
  ]);
  await hub.waitForLoadState();
  const theme = railOf(page).getByRole("button", { name: "Tema", exact: true });
  await theme.click();
  await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
  await expect(hub.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.click();
  await page.getByRole("menuitemradio", { name: "Claro" }).click();
  await expect(hub.locator("html")).toHaveAttribute("data-theme", "light");
});

test("searches the hub from the header of a profile page", async ({ page }) => {
  await page.goto("/u/ana");
  await page
    .getByRole("banner")
    .getByRole("searchbox", { name: "Buscar en el hub" })
    .fill("ventas");
  await expect(page).toHaveURL(/\/hub$/);
  await expect(page.getByRole("heading", { level: 2, name: "Resultados" })).toBeVisible();
});

test("shows only the hub, without the editor, when visiting /hub", async ({ page }) => {
  await page.goto("/hub");
  await expect(page.getByRole("heading", { level: 1, name: "Hub" })).toBeAttached();
  await expect(
    page.getByRole("banner").getByRole("searchbox", { name: "Buscar en el hub" }),
  ).toBeVisible();
  await expect(canvasOf(page)).toHaveCount(0);
  await expect(page.getByRole("banner", { name: "Acciones del flujo" })).toHaveCount(0);
});
