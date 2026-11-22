import type { LineageEvent } from "@nodomics/ui";

export type PublicationSummaryLike = {
  readonly latestVersion?: string | undefined;
};

export function lineageFromSummary(summary: PublicationSummaryLike): LineageEvent[] {
  const version = summary.latestVersion;
  if (version === undefined || version === "1.0.0" || version === "1.0") {
    return ["origin"];
  }
  return ["origin", "adapt"];
}
