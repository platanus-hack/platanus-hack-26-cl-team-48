import { expect, type Locator, type Page } from "@playwright/test";

const SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
// A node's accessible name is "<title>, <state>"; both ready states mean a usable result.
const READY_STATE = /, Listo( · caché)?$/;
const STALE_STATE = /, Desactualizado$/;
// Short enough to time the 1M-row run to a few tens of milliseconds.
const STATE_POLL_MS = 20;

// React Flow only starts a drag after the pointer moves a few times.
const DRAG_STEPS = 10;

const escapeForPattern = (text: string) => text.replace(SPECIAL_CHARACTERS, "\\$&");

export const canvasOf = (page: Page): Locator =>
  page.getByRole("region", { name: "Lienzo del flujo" });

const nodeNamed = (scope: Page | Locator, title: string) =>
  scope.getByRole("group", { name: new RegExp(`^${escapeForPattern(title)}, `) });

/** A node on the canvas, found by its title whatever its state. */
export const nodeOnCanvas = (page: Page, title: string): Locator =>
  nodeNamed(canvasOf(page), title);

export const nodeStateLabels = (page: Page): Promise<string[]> =>
  canvasOf(page)
    .locator(".web-node")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));

/** Waits until the canvas shows `nodeCount` nodes and every one of them is "Listo". */
export const waitForAllNodesReady = (page: Page, nodeCount: number): Promise<void> =>
  waitForEveryNode(page, nodeCount, READY_STATE);

/**
 * Waits until the engine reports every node of a flow it has not run as "Desactualizado": the
 * nodes start as "Sin ejecutar" and only change once the engine received the flow.
 */
export const waitForFlowInEngine = (page: Page, nodeCount: number): Promise<void> =>
  waitForEveryNode(page, nodeCount, STALE_STATE);

async function waitForEveryNode(page: Page, nodeCount: number, state: RegExp): Promise<void> {
  await expect
    .poll(async () => (await nodeStateLabels(page)).filter((label) => state.test(label)), {
      intervals: [STATE_POLL_MS],
    })
    .toHaveLength(nodeCount);
}

export const runButton = (page: Page): Locator =>
  page.getByRole("button", { name: "Ejecutar", exact: true });

/** The app is usable once the engine accepted the connection and the run button is enabled. */
export async function waitForEngineReady(page: Page): Promise<void> {
  await expect(runButton(page)).toBeEnabled();
}

export async function addNodeFromLibrary(page: Page, name: string): Promise<void> {
  await page
    .getByRole("complementary", { name: "Biblioteca de nodos" })
    .getByRole("button", { name: new RegExp(`^${escapeForPattern(name)}\\b`) })
    .dblclick();
}

/** Drags a node by its title, e.g. so a node added on top of another one stops hiding its ports. */
export async function moveNodeBy(
  page: Page,
  title: string,
  offset: { readonly x: number; readonly y: number },
): Promise<void> {
  const box = await nodeOnCanvas(page, title).getByText(title, { exact: true }).boundingBox();
  if (box === null) throw new Error(`Node "${title}" is not on screen`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + offset.x, box.y + box.height / 2 + offset.y, {
    steps: DRAG_STEPS,
  });
  await page.mouse.up();
}

/**
 * React Flow adds to the selection while Meta (macOS) or Control (elsewhere, by user agent) is
 * held, and it tracks that key through keyboard events, not through the click's modifiers.
 */
export async function addToSelection(page: Page, title: string): Promise<void> {
  const key = (await page.evaluate(() => navigator.userAgent.includes("Mac"))) ? "Meta" : "Control";
  await page.keyboard.down(key);
  await nodeOnCanvas(page, title).click();
  await page.keyboard.up(key);
}

/** Draws a connection from the output port of one node to the input port of another. */
export async function connectNodes(page: Page, from: string, to: string): Promise<void> {
  await nodeHandle(page, from, "source").dragTo(nodeHandle(page, to, "target"));
}

const nodeHandle = (page: Page, title: string, kind: "source" | "target") =>
  canvasOf(page)
    .locator(".react-flow__node")
    .filter({ has: nodeNamed(page, title) })
    .locator(`.react-flow__handle.${kind}`)
    .first();
