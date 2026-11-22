import { writeFile } from "node:fs/promises";
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
import { railButton } from "../support/side-panel.ts";

const FLOW_NAME = "Ventas";
const SIGNED_OUT_STATUS = "Entra para guardar";
const PUBLISH = "Publicar en el hub…";

const flowNameOf = (page: Page): Locator =>
  toolbarOf(page).getByRole("textbox", { name: "Nombre del flujo" });

const shareOption = (page: Page, name: string): Locator =>
  page.getByRole("menu", { name: "Compartir" }).getByRole("menuitem", { name, exact: true });

const button = (scope: Locator, name: string): Locator =>
  scope.getByRole("button", { name, exact: true });

/** A two-node flow named `name`, saved by signing in. */
async function openSavedFlow(page: Page, name = FLOW_NAME): Promise<void> {
  await openEmptyApp(page);
  await addNodeFromLibrary(page, "Datos de ejemplo");
  await addNodeFromLibrary(page, "Filtrar");
  await flowNameOf(page).fill(name);
  await signInLocally(page);
  await expect(flowStatus(page, "Guardado")).toBeVisible();
}

/** Signs out and back in on an empty canvas, which opens the account's last flow. */
async function reopenLastFlow(page: Page): Promise<void> {
  await signOut(page);
  await chooseFlowOption(page, "Nuevo flujo");
  await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveCount(0);
  await signInLocally(page);
}

test.describe("saving flows in the account (ADR 0023)", () => {
  test("asks to sign in to save while signed out", async ({ page }) => {
    await openEmptyApp(page);

    await addNodeFromLibrary(page, "Datos de ejemplo");

    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
    await expect(flowStatus(page, SIGNED_OUT_STATUS)).toBeVisible();
    await expect(flowStatus(page, "Guardado")).toHaveCount(0);
  });

  test("hides Agente and publishing until signing in", async ({ page }) => {
    await openEmptyApp(page);
    await expect(railButton(page, "Nodos")).toBeVisible();
    await expect(railButton(page, "Agente")).toHaveCount(0);
    await button(toolbarOf(page), "Compartir").click();
    await expect(shareOption(page, "Copiar enlace")).toBeVisible();
    await expect(shareOption(page, PUBLISH)).toHaveCount(0);
    await page.keyboard.press("Escape");

    await signInLocally(page);

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
    await expect(flowStatus(page, SIGNED_OUT_STATUS)).toHaveCount(0);
  });

  test("saves later edits of the open flow while signed in", async ({ page }) => {
    await openEmptyApp(page);
    await signInLocally(page);

    await addNodeFromLibrary(page, "Datos de ejemplo");
    await flowNameOf(page).fill(FLOW_NAME);

    await expect(flowStatus(page, "Guardado")).toBeVisible();
    await expect(page.getByText("Sin guardar en este navegador")).toHaveCount(0);
  });

  test("hides Agente and asks to sign in again after signing out", async ({ page }) => {
    await openSavedFlow(page);

    await signOut(page);

    await expect(railButton(page, "Agente")).toHaveCount(0);
    await expect(flowStatus(page, SIGNED_OUT_STATUS)).toBeVisible();
  });

  test("opens the account's last flow when signing in with an empty canvas", async ({ page }) => {
    await openSavedFlow(page);

    await reopenLastFlow(page);

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
    await reopenLastFlow(page);
    await expect(flowNameOf(page)).toHaveValue("CSV local");

    await runButton(page).click();

    await waitForAllNodesReady(page, 1);
    const preview = await showPreview(page, "ventas.csv", ["producto", "stock"]);
    expect(preview.rows).toEqual([
      ["Té", "12"],
      ["Café", "7"],
    ]);
  });
});
