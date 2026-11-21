import { vi } from "vitest";

// jsdom has no ResizeObserver, which the canvas and its previews need to measure themselves.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Undo with `vi.unstubAllGlobals()`. */
export function stubResizeObserver(): void {
  if (typeof globalThis.ResizeObserver === "undefined")
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
}
