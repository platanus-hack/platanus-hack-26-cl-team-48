import { readFile, writeFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { waitForEngineReady } from "./canvas.ts";
import { toSharedFlowPath } from "./shared-flow-link.ts";

/** Opens the app on a share link; the app runs a shared flow as soon as the engine connects. */
export async function openSharedFlow(page: Page, flow: unknown): Promise<void> {
  await page.goto(toSharedFlowPath(flow));
  await waitForEngineReady(page);
}

/** Opens the editor, which starts on an empty canvas while signed out; `/` is the hub (ADR 0024). */
export async function openEmptyApp(page: Page): Promise<void> {
  await page.goto("/editor");
  await waitForEngineReady(page);
}

/** Opens the "Opciones del flujo" menu of the top bar and picks one of its items. */
export async function chooseFlowOption(page: Page, item: string): Promise<void> {
  await page.getByRole("button", { name: "Opciones del flujo" }).click();
  await page
    .getByRole("menu", { name: "Opciones del flujo" })
    .getByRole("menuitem", { name: item })
    .click();
}

/** Loads a `.nodo.json` file through "Importar archivo…", as a user picks it in the file dialog. */
export async function importFlowFile(page: Page, path: string): Promise<void> {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    chooseFlowOption(page, "Importar archivo…"),
  ]);
  await chooser.setFiles(path);
}

export async function importFlow(page: Page, flow: unknown, path: string): Promise<void> {
  await writeFile(path, JSON.stringify(flow));
  await importFlowFile(page, path);
}

export type ExportedFlow = {
  readonly path: string;
  readonly fileName: string;
  readonly flow: unknown;
};

/** Chooses "Exportar archivo" and keeps the downloaded file at `path`. */
export async function exportFlow(page: Page, path: string): Promise<ExportedFlow> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    chooseFlowOption(page, "Exportar archivo"),
  ]);
  await download.saveAs(path);
  return {
    path,
    fileName: download.suggestedFilename(),
    flow: JSON.parse(await readFile(path, "utf8")) as unknown,
  };
}
