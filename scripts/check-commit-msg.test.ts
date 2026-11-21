import { describe, expect, it } from "vitest";
import { findAiAttribution } from "./ai-attribution.ts";

describe("findAiAttribution", () => {
  it("accepts a plain conventional commit", () => {
    expect(findAiAttribution("feat(coordinator): invalidate downstream nodes")).toEqual([]);
  });

  it("rejects a co-author trailer for an AI assistant", () => {
    expect(
      findAiAttribution("fix: x\n\nCo-Authored-By: Claude Opus <noreply@anthropic.com>"),
    ).not.toEqual([]);
  });

  it("rejects generated-with footers", () => {
    expect(findAiAttribution("docs: y\n\nGenerated with Claude Code")).not.toEqual([]);
  });

  it("rejects mentions regardless of case", () => {
    expect(findAiAttribution("chore: ask CLAUDE to tidy")).not.toEqual([]);
  });

  it("does not flag words that merely contain the letters", () => {
    expect(findAiAttribution("fix: handle claudette variable")).toEqual([]);
  });
});
