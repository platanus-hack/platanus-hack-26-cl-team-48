import { createHash } from "node:crypto";
import type { ProfileEmbeddingTexts } from "@nodomics/profile";

export type ContentHashInput = {
  readonly model: string;
  readonly texts: ProfileEmbeddingTexts;
};

/** JSON framing keeps text moving between offers and seeks from colliding. */
export function contentHashOf({ model, texts }: ContentHashInput): string {
  const framed = JSON.stringify([model, texts.offers, texts.seeks ?? null]);
  return createHash("sha256").update(framed).digest("hex");
}
