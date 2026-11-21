import type { DisplayContent, DisplayRef } from "@nodomics/protocol";
import { MESSAGES } from "../messages.ts";

/** Bytes per call to String.fromCharCode, well under the engines' limit on arguments. */
const CHUNK_SIZE = 0x8000;

/** A URL the `<img>` can show without the interface keeping a file or a blob to release. */
export function toDataUrl({ mime, bytes }: DisplayContent): string {
  const chunks = Array.from({ length: Math.ceil(bytes.length / CHUNK_SIZE) }, (_, index) =>
    String.fromCharCode(...bytes.subarray(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)),
  );
  return `data:${mime};base64,${btoa(chunks.join(""))}`;
}

export const describeFigure = (display: DisplayRef, index: number): string =>
  display.title ?? MESSAGES.preview.untitledFigure(index + 1);
