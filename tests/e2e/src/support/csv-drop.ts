import type { Page } from "@playwright/test";
import { APP_ORIGIN } from "./app-origin.ts";
import { canvasOf } from "./canvas.ts";

// Vite only serves files of the project, so the test serves the CSV itself on a path of the app.
const CSV_ROUTE_PREFIX = `${APP_ORIGIN}/__e2e__/`;

/** Drops a CSV file from disk onto the canvas, like dragging it from the file manager. */
export async function dropCsvOnCanvas(
  page: Page,
  file: { readonly name: string; readonly path: string },
) {
  const url = `${CSV_ROUTE_PREFIX}${encodeURIComponent(file.name)}`;
  await page.route(url, (route) => route.fulfill({ path: file.path, contentType: "text/csv" }));
  const dataTransfer = await page.evaluateHandle(
    async ({ url: csvUrl, name }) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([await (await fetch(csvUrl)).blob()], name, { type: "text/csv" }),
      );
      return transfer;
    },
    { url, name: file.name },
  );
  await canvasOf(page).dispatchEvent("drop", { dataTransfer });
}
