import { expect, type Locator, type Page } from "@playwright/test";
import { nodeOnCanvas } from "./canvas.ts";
import { parseDisplayedNumber } from "./displayed-number.ts";

export type PreviewTable = {
  readonly columns: ReadonlyArray<string>;
  /** Cells as the data grid shows them, without the row number. */
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
  /** The size of the whole result in the panel's header, e.g. "200 filas · 5 col.". */
  readonly summary: string;
};

export const previewOf = (page: Page): Locator =>
  page.getByRole("region", { name: "Vista previa" });

/** Nodes show their own preview by default; the panel holds the whole, pageable result. */
export async function openPreviewPanel(page: Page): Promise<void> {
  await page.getByRole("button", { name: "En panel", exact: true }).click();
  await expect(previewOf(page)).toBeVisible();
}

/** Selects a node and reads the first page of its data once the grid shows `columns`. */
export async function showPreview(
  page: Page,
  node: string,
  columns: ReadonlyArray<string>,
): Promise<PreviewTable> {
  await openPreviewPanel(page);
  await nodeOnCanvas(page, node).click();
  const table = previewOf(page).getByRole("table");
  await expect(table.getByRole("columnheader").locator(".nd-th-inline-name")).toHaveText([
    ...columns,
  ]);
  return {
    columns,
    rows: await table
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) => [...row.querySelectorAll("td")].slice(1).map((cell) => cell.innerText)),
      ),
    summary: await previewOf(page)
      .locator("header")
      .getByText(/ filas · \d+ col\.$/)
      .innerText(),
  };
}

/** The totals per region of a node that grouped the sales, as [region, total] pairs. */
export async function readRegionTotals(page: Page, node: string): Promise<Array<[string, number]>> {
  const preview = await showPreview(page, node, ["region", "total"]);
  return preview.rows.map(([region = "", total = ""]) => [region, parseDisplayedNumber(total)]);
}

export const columnOf = (table: PreviewTable, column: string): string[] =>
  table.rows.map((row) => row[table.columns.indexOf(column)] ?? "");
