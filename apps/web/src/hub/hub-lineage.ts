import type { LineageEvent } from "@nodomics/ui";

export type PublicationSummaryLike = {
  readonly latestVersion?: string | undefined;
};

/**
 * The hub does not store who adapted a publication yet, and a new version is the owner's own
 * change, so every publication shows only its origin until adaptations are recorded.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers need no change once adaptations exist
export function lineageFromSummary(_summary: PublicationSummaryLike): LineageEvent[] {
  return ["origin"];
}
