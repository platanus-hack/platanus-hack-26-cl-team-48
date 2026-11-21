import { readFile, writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  accountMenuButton,
  flowStatus,
  LOCAL_ACCOUNT,
  signInDialogOf,
  signInLocally,
  signOut,
  toolbarOf,
} from "../support/account.ts";
import {
  addNodeFromLibrary,
  nodeOnCanvas,
  runButton,
  waitForAllNodesReady,
} from "../support/canvas.ts";
import { dropCsvOnCanvas } from "../support/csv-drop.ts";
import { chooseFlowOption, openEmptyApp } from "../support/flow-files.ts";
import { showPreview } from "../support/preview.ts";
import { railButton, showSidePanel, sidePanelOf } from "../support/side-panel.ts";

const FLOW_NAME = "Ventas";
const UNTITLED = "Flujo sin título";
const SIGNED_OUT_STATUS = "Entra para guardar";
const PUBLISH = "Publicar en el hub…";

const flowNameOf = (page: Page): Locator =>
  toolbarOf(page).getByRole("textbox", { name: "Nombre del flujo" });

const cardOf = (flows: Locator, name: string): Locator =>
  flows.getByRole("article", { name, exact: true });

const shareOption = (page: Page, name: string): Locator =>
  page.getByRole("menu", { name: "Compartir" }).getByRole("menuitem", { name, exact: true });

const button = (scope: Locator, name: string): Locator =>
  scope.getByRole("button", { name, exact: true });

/** A two-node flow named `name`, saved by signing in, with "Mis flujos" shown. */
async function openSavedFlow(page: Page, name = FLOW_NAME): Promise<Locator> {
  await openEmptyApp(page);
  await addNodeFromLibrary(page, "Datos de ejemplo");
  await addNodeFromLibrary(page, "Filtrar");
  await flowNameOf(page).fill(name);
  await signInLocally(page);
  await expect(flowStatus(page, "Guardado")).toBeVisible();
  return showSidePanel(page, "Mis flujos");
}

test.describe("saving flows in the account (ADR 0023)", () => {
  test("asks to sign in to save while signed out", async ({ page }) => {
    await openEmptyApp(page);

    await addNodeFromLibrary(page, "Datos de ejemplo");

    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
    await expect(flowStatus(page, SIGNED_OUT_STATUS)).toBeVisible();
    await expect(flowStatus(page, "Guardado")).toHaveCount(0);
  });

  test("hides Mis flujos, Agente and publishing until signing in", async ({ page }) => {
    await openEmptyApp(page);
    await expect(railButton(page, "Nodos")).toBeVisible();
    await expect(railButton(page, "Mis flujos")).toHaveCount(0);
    await expect(railButton(page, "Agente")).toHaveCount(0);
    await button(toolbarOf(page), "Compartir").click();
    await expect(shareOption(page, "Copiar enlace")).toBeVisible();
    await expect(shareOption(page, PUBLISH)).toHaveCount(0);
    await page.keyboard.press("Escape");

    await signInLocally(page);

    await expect(railButton(page, "Mis flujos")).toBeVisible();
    await expect(railButton(page, "Agente")).toBeVisible();
    await button(toolbarOf(page), "Compartir").click();
    await expect(shareOption(page, PUBLISH)).toBeVisible();
  });

  test("signs in to the local account with its handle as the email", async ({ page }) => {
    await openEmptyApp(page);
    await button(toolbarOf(page), "Entrar").click();
    const dialog = signInDialogOf(page);

    await dialog.getByRole("textbox", { name: "Correo" }).fill(LOCAL_ACCOUNT.handle);
    await button(dialog, "Enviarme un enlace").click();

    await expect(accountMenuButton(page)).toBeVisible();
  });

  test("saves the open flow in the account when signing in", async ({ page }) => {
    await openEmptyApp(page);
    await addNodeFromLibrary(page, "Datos de ejemplo");

    await signInLocally(page);

    await expect(flowStatus(page, "Guardado")).toBeVisible();
    const card = cardOf(await showSidePanel(page, "Mis flujos"), UNTITLED);
    await expect(card).toBeVisible();
    await expect(card.getByText("Privado", { exact: true })).toBeVisible();
    await expect(button(card, "Hacer público")).toBeVisible();
  });

  test("saves later edits of the open flow while signed in", async ({ page }) => {
    await openEmptyApp(page);
    await signInLocally(page);

    await addNodeFromLibrary(page, "Datos de ejemplo");
    await flowNameOf(page).fill(FLOW_NAME);

    await expect(flowStatus(page, "Guardado")).toBeVisible();
    await expect(cardOf(await showSidePanel(page, "Mis flujos"), FLOW_NAME)).toBeVisible();
    await expect(page.getByText("Sin guardar en este navegador")).toHaveCount(0);
  });

  test("makes a saved flow public", async ({ page }) => {
    const card = cardOf(await openSavedFlow(page), FLOW_NAME);

    await button(card, "Hacer público").click();

    await expect(card.getByText("Público", { exact: true })).toBeVisible();
    await expect(button(card, "Hacer privado")).toBeVisible();
  });

  test("makes a public flow private again", async ({ page }) => {
    const card = cardOf(await openSavedFlow(page), FLOW_NAME);
    await button(card, "Hacer público").click();

    await button(card, "Hacer privado").click();

    await expect(card.getByText("Privado", { exact: true })).toBeVisible();
    await expect(button(card, "Hacer público")).toBeVisible();
  });

  test("opens a saved flow again after starting a new one", async ({ page }) => {
    const flows = await openSavedFlow(page);
    await button(flows, "Nuevo flujo").click();
    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveCount(0);

    await button(cardOf(flows, FLOW_NAME), "Abrir").click();

    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
    await expect(nodeOnCanvas(page, "Filtrar")).toBeVisible();
    await expect(flowNameOf(page)).toHaveValue(FLOW_NAME);
    await expect(sidePanelOf(page, "Mis flujos")).toBeVisible();
  });

  test("duplicates a saved flow", async ({ page }) => {
    const flows = await openSavedFlow(page);

    await button(cardOf(flows, FLOW_NAME), "Duplicar").click();

    await expect(cardOf(flows, `${FLOW_NAME} (copia)`)).toBeVisible();
    await expect(cardOf(flows, FLOW_NAME)).toBeVisible();
  });

  test("renames a saved flow from its card", async ({ page }) => {
    const flows = await openSavedFlow(page);
    const card = cardOf(flows, FLOW_NAME);
    await button(card, "Renombrar").click();

    await card.getByRole("textbox", { name: "Nombre del flujo" }).fill("Ventas 2026");
    await button(card, "Guardar nombre").click();

    await expect(cardOf(flows, "Ventas 2026")).toBeVisible();
    await expect(cardOf(flows, FLOW_NAME)).toHaveCount(0);
  });

  test("exports a saved flow as a file", async ({ page }, testInfo) => {
    const flows = await openSavedFlow(page);
    const path = testInfo.outputPath("ventas.nodo.json");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      button(cardOf(flows, FLOW_NAME), "Exportar").click(),
    ]);
    await download.saveAs(path);

    expect(download.suggestedFilename()).toMatch(/\.nodo\.json$/);
    const exported = JSON.parse(await readFile(path, "utf8")) as { readonly nodes: unknown[] };
    expect(exported).toMatchObject({ name: FLOW_NAME });
    expect(exported.nodes).toHaveLength(2);
  });

  test("deletes a saved flow after confirming", async ({ page }) => {
    const flows = await openSavedFlow(page);
    const card = cardOf(flows, FLOW_NAME);

    await button(card, "Borrar").click();
    await button(card, "Confirmar borrado").click();

    await expect(cardOf(flows, FLOW_NAME)).toHaveCount(0);
  });

  test("hides Mis flujos and asks to sign in again after signing out", async ({ page }) => {
    const flows = await openSavedFlow(page);
    await expect(cardOf(flows, FLOW_NAME)).toBeVisible();

    await signOut(page);

    await expect(sidePanelOf(page, "Mis flujos")).toHaveCount(0);
    await expect(railButton(page, "Mis flujos")).toHaveCount(0);
    await expect(flowStatus(page, SIGNED_OUT_STATUS)).toBeVisible();
  });

  test("opens the account's last flow when signing in with an empty canvas", async ({ page }) => {
    await openSavedFlow(page);
    await signOut(page);
    await chooseFlowOption(page, "Nuevo flujo");
    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveCount(0);

    await signInLocally(page);

    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
    await expect(flowNameOf(page)).toHaveValue(FLOW_NAME);
  });

  test("reconnects the CSV of a saved flow when opening it again", async ({ page }, testInfo) => {
    await openEmptyApp(page);
    await signInLocally(page);
    const path = testInfo.outputPath("ventas.csv");
    await writeFile(path, "producto,stock\nTé,12\nCafé,7\n");
    await dropCsvOnCanvas(page, { name: "ventas.csv", path });
    await flowNameOf(page).fill("CSV local");
    await expect(flowStatus(page, "Guardado")).toBeVisible();
    const flows = await showSidePanel(page, "Mis flujos");
    await button(flows, "Nuevo flujo").click();

    await button(cardOf(flows, "CSV local"), "Abrir").click();
    await runButton(page).click();

    await waitForAllNodesReady(page, 1);
    const preview = await showPreview(page, "ventas.csv", ["producto", "stock"]);
    expect(preview.rows).toEqual([
      ["Té", "12"],
      ["Café", "7"],
    ]);
  });
});
