import { useSyncExternalStore } from "react";

/**
 * How much room the workspace has. `medium` folds the library into icons, `narrow` hides the
 * parameters and `phone` also hides the library. CSS media queries cannot read the design
 * tokens, so the breakpoints of the design live here and reach the styles as `data-viewport`.
 */
export type ViewportSize = "wide" | "medium" | "narrow" | "phone";

const MEDIUM_BELOW = 1100;
const NARROW_BELOW = 820;
const PHONE_BELOW = 600;

export function viewportSizeOf(width: number): ViewportSize {
  if (width < PHONE_BELOW) return "phone";
  if (width < NARROW_BELOW) return "narrow";
  return width < MEDIUM_BELOW ? "medium" : "wide";
}

export function useViewportSize(): ViewportSize {
  return useSyncExternalStore(subscribeToResize, () => viewportSizeOf(window.innerWidth));
}

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
  };
}
