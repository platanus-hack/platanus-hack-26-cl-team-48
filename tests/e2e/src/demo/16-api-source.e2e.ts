import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";
import { addNodeFromLibrary, runButton, waitForAllNodesReady } from "../support/canvas.ts";
import { exportFlow, openEmptyApp } from "../support/flow-files.ts";
import { showPreview } from "../support/preview.ts";

const API_URL = "https://api.example.test/ventas";
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Authorization",
};

async function answerSales(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  expect(await route.request().headerValue("authorization")).toBe("Bearer secreto");
  await route.fulfill({
    status: 200,
    headers: CORS_HEADERS,
    contentType: "application/json",
    body: JSON.stringify({
      data: {
        items: [
          { producto: "Té", stock: 12 },
          { producto: "Café", stock: 7 },
        ],
      },
    }),
  });
}

async function createCredential(page: Page) {
  await page.getByRole("button", { name: "Mis flujos" }).click();
  await page.getByRole("tab", { name: "Credenciales" }).click();
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("ventas-token");
  await page.getByLabel("Valor", { exact: true }).fill("Bearer secreto");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByRole("article", { name: "ventas-token" })).toBeVisible();
  await expect(page.getByLabel("Valor", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
}

async function configureApi(page: Page) {
  await addNodeFromLibrary(page, "API");
  const params = page.getByRole("complementary", { name: "Parámetros", exact: true });
  await params.getByRole("textbox", { name: "Dirección" }).fill(API_URL);
  await params
    .getByRole("group", { name: "Encabezados", exact: true })
    .getByRole("button", { name: "Agregar", exact: true })
    .click();
  await params.getByRole("textbox", { name: "Nombre", exact: true }).fill("Authorization");
  await params.getByRole("switch", { name: "Usar credencial" }).click();
  await params
    .getByRole("combobox", { name: "Credencial", exact: true })
    .selectOption("ventas-token");
  await params.getByRole("textbox", { name: "Ruta de los registros" }).fill("data.items");
}

test("reads an authenticated API and exports credential references without their values", async ({
  page,
}, testInfo) => {
  await page.route(API_URL, answerSales);
  await openEmptyApp(page);
  await createCredential(page);
  await configureApi(page);
  await runButton(page).click();

  await waitForAllNodesReady(page, 1);
  expect((await showPreview(page, "API", ["producto", "stock"])).rows).toEqual([
    ["Té", "12"],
    ["Café", "7"],
  ]);
  const exported = await exportFlow(page, testInfo.outputPath("api.nodo.json"));
  expect(await readFile(exported.path, "utf8")).not.toContain("secreto");
  expect(exported.flow).toMatchObject({
    nodes: [
      {
        params: {
          headers: [{ name: "Authorization", secret: "ventas-token" }],
        },
      },
    ],
  });
});
