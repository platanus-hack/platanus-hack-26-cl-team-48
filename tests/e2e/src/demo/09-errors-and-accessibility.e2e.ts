import { expect, test } from "@playwright/test";
import { canvasOf, nodeOnCanvas, waitForAllNodesReady } from "../support/canvas.ts";
import { missingColumnFlow, sampleOnlyFlow } from "../support/demo-flows.ts";
import { openEmptyApp, openSharedFlow } from "../support/flow-files.ts";
import { openPreviewPanel, previewOf } from "../support/preview.ts";
import { railButton, railOf, SIGNED_OUT_SECTIONS, sidePanelOf } from "../support/side-panel.ts";

test.describe("visible errors", () => {
  test("shows on the node the error of a parameter naming a missing column", async ({ page }) => {
    await openSharedFlow(page, missingColumnFlow());

    await expect(nodeOnCanvas(page, "Filtrar")).toHaveAccessibleName("Filtrar, Error");
    await expect(nodeOnCanvas(page, "Datos de ejemplo")).toHaveAccessibleName(
      "Datos de ejemplo, Listo",
    );
    await expect(canvasOf(page).locator(".web-node-note")).toContainText("no_existe");
  });
});

test.describe("accessibility of the controls the demo uses", () => {
  test("names every toolbar, library and panel control by its role", async ({ page }) => {
    await openEmptyApp(page);

    const toolbar = page.getByRole("banner", { name: "Acciones del flujo" });
    await expect(toolbar.getByRole("combobox", { name: "Motor" })).toBeVisible();
    for (const name of ["Opciones del flujo", "Deshacer", "Rehacer", "Compartir", "Ejecutar"])
      await expect(toolbar.getByRole("button", { name, exact: true })).toBeVisible();
    for (const section of SIGNED_OUT_SECTIONS)
      await expect(railButton(page, section)).toBeVisible();
    await expect(railOf(page).getByRole("button", { name: "Tema", exact: true })).toBeVisible();
    const library = sidePanelOf(page, "Nodos");
    for (const region of ["Transformar", "Python", "Fuentes", "Vistas"])
      await expect(library.getByRole("region", { name: region })).toBeVisible();
    await expect(page.getByRole("region", { name: "Lienzo del flujo" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Parámetros" })).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Dónde se muestra la vista previa" }),
    ).toBeVisible();
  });

  test("names the node, parameter and preview controls of a selected node", async ({ page }) => {
    await openSharedFlow(page, sampleOnlyFlow());
    await waitForAllNodesReady(page, 1);

    await nodeOnCanvas(page, "Datos de ejemplo").click();

    const actions = canvasOf(page).getByRole("toolbar", { name: "Acciones del nodo" });
    for (const name of ["Ejecutar este nodo", "Ver resultado", "Desactivar nodo", "Más acciones"])
      await expect(actions.getByRole("button", { name })).toBeVisible();
    await expect(nodeOnCanvas(page, "Datos de ejemplo").getByRole("status")).toHaveAccessibleName(
      "Listo",
    );
    await expect(
      page
        .getByRole("complementary", { name: "Parámetros" })
        .getByRole("combobox", { name: "Conjunto de datos" }),
    ).toHaveValue("ventas");
    await openPreviewPanel(page);
    const preview = previewOf(page);
    await expect(preview.getByRole("tab", { name: "Datos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(preview.getByRole("tab", { name: "Perfil" })).toBeVisible();
    await expect(preview.getByRole("combobox", { name: "Ordenar por" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "Página siguiente" })).toBeEnabled();
    await expect(preview.getByRole("table").getByRole("columnheader")).toHaveCount(6);
  });
});
