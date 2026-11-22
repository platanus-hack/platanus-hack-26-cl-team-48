import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThreadGlyph, type ThreadGlyphKind } from "./ThreadGlyph.tsx";

const ALL_GLYPH_KINDS: readonly ThreadGlyphKind[] = [
  "crosses",
  "braids",
  "tangles",
  "untangles",
  "breaks",
  "splices",
];

describe("ThreadGlyph", () => {
  it.each(ALL_GLYPH_KINDS)("renders without error for kind %s", (kind) => {
    const glyphKind: ThreadGlyphKind = kind;

    const { container } = render(<ThreadGlyph kind={glyphKind} />);

    expect(container.firstElementChild).not.toBeNull();
  });

  it("applies a custom class name when provided", () => {
    const customClass = "custom-thread-glyph";

    const { container } = render(<ThreadGlyph className={customClass} kind="braids" />);

    expect(container.firstElementChild?.classList.contains(customClass)).toBe(true);
  });
});
