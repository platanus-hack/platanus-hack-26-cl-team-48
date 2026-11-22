import { describe, expect, it } from "vitest";
import { lineageFromSummary } from "./hub-lineage.ts";

describe("lineageFromSummary", () => {
  it("returns origin for initial version 1.0.0", () => {
    const summary = { latestVersion: "1.0.0" };

    const lineage = lineageFromSummary(summary);

    expect(lineage).toEqual(["origin"]);
  });

  it("returns origin when summary has no latest version", () => {
    const summary = {};

    const lineage = lineageFromSummary(summary);

    expect(lineage).toEqual(["origin"]);
  });

  it("returns origin and adapt for a minor version increment", () => {
    const summary = { latestVersion: "1.1.0" };

    const lineage = lineageFromSummary(summary);

    expect(lineage).toEqual(["origin", "adapt"]);
  });

  it("returns origin and adapt for a major version bump", () => {
    const summary = { latestVersion: "2.0.0" };

    const lineage = lineageFromSummary(summary);

    expect(lineage).toEqual(["origin", "adapt"]);
  });
});
