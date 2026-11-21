import { expect, test, type Page } from "@playwright/test";
import { nodeOnCanvas, waitForAllNodesReady } from "../support/canvas.ts";
import { pythonCodeFlow } from "../support/demo-flows.ts";
import { openSharedFlow } from "../support/flow-files.ts";
import { openPreviewPanel, previewOf } from "../support/preview.ts";

const CODE_NODE = "Código Python";
const FIGURE_TITLE = "Unidades por región";

const DRAWS_A_FIGURE = `import matplotlib.pyplot as plt

def transform(inputs):
    table = inputs["in"]
    totals = table.groupby("region")["unidades"].sum()
    plt.figure(figsize=(5, 3))
    plt.bar(totals.index, totals.values)
    plt.title("${FIGURE_TITLE}")
    plt.show()
    return {"out": table}
`;

const FAILS_ON_LINE_3 = `def transform(inputs):
    table = inputs["in"]
    return {"out": table["no_existe"]}
`;

const PASSES_THROUGH = `import pandas as pd

def transform(inputs):
    return {"out": inputs["in"]}
`;

const codeEditor = (page: Page) =>
  page.getByRole("complementary", { name: "Parámetros" }).getByRole("textbox", { name: "Código" });

// An option's accessible name runs its label and detail together, so the label is matched alone.
const completionOption = (page: Page, label: string) =>
  page.locator(".cm-tooltip-autocomplete .cm-completionLabel").getByText(label, { exact: true });

async function openCode(page: Page, code: string): Promise<void> {
  await openSharedFlow(page, pythonCodeFlow(code));
  await nodeOnCanvas(page, CODE_NODE).locator(".web-node-title").click();
  await expect(codeEditor(page)).toHaveClass(/cm-content/);
}

async function typeAtTheEnd(page: Page, text: string): Promise<void> {
  await codeEditor(page).click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(text);
}

test.describe("Python code: editor and figures", () => {
  test("shows what plt.show() draws inside the node and in the panel", async ({ page }) => {
    await openSharedFlow(page, pythonCodeFlow(DRAWS_A_FIGURE));
    await waitForAllNodesReady(page, 2);

    await expect(
      nodeOnCanvas(page, CODE_NODE).getByRole("img", { name: FIGURE_TITLE }),
    ).toBeVisible();
    await openPreviewPanel(page);
    await nodeOnCanvas(page, CODE_NODE).click();
    await expect(previewOf(page).getByRole("tab", { name: "Gráfico" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(previewOf(page).getByRole("img", { name: FIGURE_TITLE })).toBeVisible();
  });

  test("completes the node's inputs, the environment's modules and library members", async ({
    page,
  }) => {
    await openCode(page, PASSES_THROUGH);

    await typeAtTheEnd(page, 'x = inputs["');
    await expect(completionOption(page, "in")).toBeVisible();
    await page.keyboard.press("Escape");
    await typeAtTheEnd(page, "\nimport matplot");
    await expect(completionOption(page, "matplotlib")).toBeVisible();
    await page.keyboard.press("Escape");
    await typeAtTheEnd(page, "\npd.read_cs");
    await expect(completionOption(page, "read_csv")).toBeVisible();
  });

  test("marks the line of the user's code where the last run failed", async ({ page }) => {
    await openCode(page, FAILS_ON_LINE_3);

    await expect(codeEditor(page).locator(".cm-lintRange-error")).toHaveText(
      'return {"out": table["no_existe"]}',
    );
  });

  test("enlarges the editor and closes it with Escape, back on its button", async ({ page }) => {
    await openCode(page, PASSES_THROUGH);
    const expand = page.getByRole("button", { name: "Ampliar editor" });

    await expand.click();
    const dialog = page.getByRole("dialog", { name: "Código" });
    await expect(dialog.getByRole("textbox", { name: "Código" })).toBeFocused();
    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(expand).toBeFocused();
  });
});
