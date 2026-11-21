import { vi } from "vitest";

export type Download = { readonly name: string; readonly blob: Blob };

/**
 * jsdom has no object URLs and does not download, so both are recorded instead. Undo the anchor
 * spy with `vi.restoreAllMocks()`.
 */
export function recordDownloads(): ReadonlyArray<Download> {
  const blobs = new Map<string, Blob>();
  const downloads: Download[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      const url = `blob:test/${String(blobs.size)}`;
      blobs.set(url, blob);
      return url;
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => undefined });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (blob !== undefined) downloads.push({ name: this.download, blob });
  });
  return downloads;
}
