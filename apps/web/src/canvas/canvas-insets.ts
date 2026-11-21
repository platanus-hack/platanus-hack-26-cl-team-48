import type { CanvasInsets } from "./initial-viewport.ts";

const SIDES = ["top", "right", "bottom", "left"] as const;
const FRAME = "[data-canvas-frame]";

/**
 * The panels floating over a canvas, by the side they cover (`data-canvas-inset`). Only panels in
 * the canvas's own frame count, so a second canvas, like the hub's preview, ignores the editor's.
 */
export function canvasInsets(canvas: Element): CanvasInsets {
  const scope: ParentNode = canvas.closest(FRAME) ?? canvas.ownerDocument;
  return Object.fromEntries(
    SIDES.flatMap((side) => {
      const rect = scope.querySelector(`[data-canvas-inset="${side}"]`)?.getBoundingClientRect();
      return rect === undefined || rect.width === 0 ? [] : [[side, rect]];
    }),
  );
}
