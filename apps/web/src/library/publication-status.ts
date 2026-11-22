import type { SavedFlow } from "./flow-library.ts";

export type PublicationStatus =
  | { readonly kind: "unpublished" }
  | { readonly kind: "published"; readonly version: string }
  | { readonly kind: "changed"; readonly version: string };

/** Whether the flow was published, and whether it changed since (ADR 0024). */
export function publicationStatusOf({ published }: SavedFlow): PublicationStatus {
  if (published === undefined) return { kind: "unpublished" };
  return { kind: published.hasChanges ? "changed" : "published", version: published.version };
}
