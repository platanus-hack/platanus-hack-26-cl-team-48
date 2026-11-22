import { expect, test, type Page } from "@playwright/test";
import { signInLocally } from "./support/account.ts";
import {
  canvasOf,
  nodeOnCanvas,
  waitForAllNodesReady,
  waitForEngineReady,
} from "./support/canvas.ts";
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
  // "Agente" needs an account (ADR 0023).
  await signInLocally(page);
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

test("shows Nodos instead of a remembered section that needs an account while signed out", async ({
  page,
}) => {
  await openEmptyApp(page);
  await signInLocally(page);
  await showSidePanel(page, "Agente");

  // The local account lives in memory, so reloading signs out (ADR 0023).
  await page.reload();

  await expect(sidePanelOf(page, "Nodos")).toBeVisible();
  await expect(railButton(page, "Nodos")).toHaveAttribute("aria-pressed", "true");
  await expect(sidePanelOf(page, "Agente")).toHaveCount(0);
});

test("shows the agent as a mockup that cannot act", async ({ page }) => {
  await openEmptyApp(page);
  await signInLocally(page);
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

test("leaves Mis flujos out of the editor's rail, since saved flows live in the hub", async ({
  page,
}) => {
  await openEmptyApp(page);

  await signInLocally(page);

  await expect(railButton(page, "Agente")).toBeVisible();
  await expect(railOf(page).getByRole("button", { name: "Mis flujos", exact: true })).toHaveCount(
    0,
  );
});

test("opens the hub at the home page in another tab with its own header", async ({ page }) => {
  await openEmptyApp(page);
  const [hub] = await Promise.all([
    page.context().waitForEvent("page"),
    railOf(page).getByRole("link", { name: "Abrir el hub en otra pestaña" }).click(),
  ]);
  await hub.waitForLoadState();
  expect(new URL(hub.url()).pathname).toBe("/");
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
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 2, name: "Resultados" })).toBeVisible();
});

const exploreGroupOf = (page: Page) =>
  page
    .getByRole("complementary", { name: "Filtros del hub" })
    .getByRole("radiogroup", { name: "Explorar" });

const exploreViewOf = (page: Page, name: string) =>
  exploreGroupOf(page).getByRole("radio", { name, exact: true });

/** Picks a view by its label, as a user does: the styled label covers the radio itself. */
const chooseExploreView = (page: Page, name: string) =>
  exploreGroupOf(page).getByText(name, { exact: true }).click();

/** Signs in to the local account from the hub's header; the hub keeps it until the page reloads. */
async function signInOnTheHub(page: Page): Promise<void> {
  await page.getByRole("banner").getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Entrar a Nodomics" })
    .getByRole("button", { name: "Continuar con GitHub" })
    .click();
}

test("offers Mis flujos and Mis publicaciones in the hub only while signed in", async ({
  page,
}) => {
  await page.goto("/");
  await expect(exploreViewOf(page, "Para ti")).toBeVisible();
  await expect(exploreViewOf(page, "Recientes")).toBeVisible();
  await expect(exploreViewOf(page, "Mis flujos")).toHaveCount(0);
  await expect(exploreViewOf(page, "Mis publicaciones")).toHaveCount(0);

  await signInOnTheHub(page);

  await expect(exploreViewOf(page, "Mis flujos")).toBeVisible();
  await expect(exploreViewOf(page, "Mis publicaciones")).toBeVisible();
});

test("shows an empty Mis flujos in the hub for an account without saved flows", async ({
  page,
}) => {
  await page.goto("/");
  await signInOnTheHub(page);

  await chooseExploreView(page, "Mis flujos");

  await expect(page.getByRole("heading", { level: 2, name: "Mis flujos" })).toBeVisible();
  await expect(page.getByText("Todavía no hay flujos guardados.")).toBeVisible();
});

test("opens an empty editor in the same tab from Nuevo flujo in Mis flujos", async ({ page }) => {
  await page.goto("/");
  await signInOnTheHub(page);
  await chooseExploreView(page, "Mis flujos");

  await page.getByRole("button", { name: "Nuevo flujo", exact: true }).click();

  await expect(page).toHaveURL((url) => url.pathname === "/editor");
  await waitForEngineReady(page);
  await expect(canvasOf(page)).toBeVisible();
  await expect(canvasOf(page).locator(".web-node")).toHaveCount(0);
  expect(page.context().pages()).toHaveLength(1);
});

for (const path of ["/", "/hub"])
  test(`shows only the hub, without the editor, when visiting ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Hub" })).toBeAttached();
    await expect(
      page.getByRole("banner").getByRole("searchbox", { name: "Buscar en el hub" }),
    ).toBeVisible();
    await expect(canvasOf(page)).toHaveCount(0);
    await expect(page.getByRole("banner", { name: "Acciones del flujo" })).toHaveCount(0);
  });

test("does not offer to open the editor from the hub's header", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Hub" })).toBeAttached();

  await expect(page.getByRole("banner").getByRole("link", { name: "Abrir el editor" })).toHaveCount(
    0,
  );
});

for (const path of ["/editor", "/editor?new"])
  test(`opens the editor on an empty canvas when visiting ${path}`, async ({ page }) => {
    await page.goto(path);

    await waitForEngineReady(page);

    await expect(canvasOf(page)).toBeVisible();
    await expect(canvasOf(page).locator(".web-node")).toHaveCount(0);
  });

test("still opens the editor on an old shared link to the home page", async ({ page }) => {
  await openSharedFlow(page, sampleOnlyFlow());

  await waitForAllNodesReady(page, 1);

  await expect(nodeOnCanvas(page, "Datos de ejemplo")).toBeVisible();
});
