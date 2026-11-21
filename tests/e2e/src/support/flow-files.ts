import { readFile, writeFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { waitForEngineReady } from "./canvas.ts";
import { toSharedFlowPath } from "./shared-flow-link.ts";

/** Opens the app on a share link; the app runs a shared flow as soon as the engine connects. */
export async function openSharedFlow(page: Page, flow: unknown): Promise<void> {
  await page.goto(toSharedFlowPath(flow));
  await waitForEngineReady(page);
}

export async function openEmptyApp(page: Page): Promise<void> {
  await page.goto("/");
  await waitForEngineReady(page);
}

/** Loads a `.nodo.json` file through "Importar", as a user picks it in the file dialog. */
export async function importFlowFile(page: Page, path: string): Promise<void> {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Importar" }).click(),
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

/** Clicks "Exportar" and keeps the downloaded file at `path`. */
export async function exportFlow(page: Page, path: string): Promise<ExportedFlow> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar" }).click(),
  ]);
  await download.saveAs(path);
  return {
    path,
    fileName: download.suggestedFilename(),
    flow: JSON.parse(await readFile(path, "utf8")) as unknown,
  };
}
