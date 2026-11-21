import { expect, test } from "@playwright/test";
import { openEmptyApp } from "../support/flow-files.ts";

test("replaces conversion with editable flow boundary nodes", async ({ page }) => {
  await openEmptyApp(page);
  await expect(page.getByRole("button", { name: "Convertir en nodo" })).toHaveCount(0);
  const library = page.getByRole("complementary", { name: "Biblioteca de nodos" });
  await expect(library.getByRole("button", { name: "Entrada de nodo", exact: true })).toBeVisible();
  await expect(library.getByRole("button", { name: "Salida de nodo", exact: true })).toBeVisible();
});
