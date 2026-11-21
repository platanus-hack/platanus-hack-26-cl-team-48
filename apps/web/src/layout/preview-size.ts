import { clampToRange, type SizeRange } from "./size-range.ts";

export type PreviewSize = {
  readonly height: number;
  readonly mode: "expanded" | "maximized";
};
export type PreviewSizeAction =
  { readonly type: "resize"; readonly height: number } | { readonly type: "maximize" | "restore" };
export const DEFAULT_PREVIEW_SIZE: PreviewSize = { height: 38, mode: "expanded" };
/** Height of the preview panel, in percent of the workspace. */
export const PREVIEW_HEIGHT_RANGE: SizeRange = { min: 20, max: 70, step: 5 };
export function changePreviewSize(size: PreviewSize, action: PreviewSizeAction): PreviewSize {
  if (action.type === "resize")
    return { height: clampToRange(PREVIEW_HEIGHT_RANGE, action.height), mode: "expanded" };
  return { ...size, mode: action.type === "maximize" ? "maximized" : "expanded" };
}
