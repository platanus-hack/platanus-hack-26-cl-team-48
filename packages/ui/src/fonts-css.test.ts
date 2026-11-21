// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tokens from "../tokens.json" with { type: "json" };

const fontsCss = readFileSync(new URL("fonts.css", import.meta.url), "utf8");

function fontFaces(css: string): ReadonlyArray<string> {
  return css.split("@font-face").slice(1);
}

describe("fonts.css", () => {
  it.each(tokens.type.fonts)("declares $family $weight from a bundled file", (font) => {
    const fileName = font.file.replace("fonts/", "");

    const face = fontFaces(fontsCss).find(
      (block) =>
        block.includes(`"${font.family}"`) && block.includes(`font-weight: ${font.weight};`),
    );

    expect(face).toContain(`url("./fonts/${fileName}") format("woff2")`);
    expect(existsSync(new URL(`fonts/${fileName}`, import.meta.url))).toBe(true);
  });

  it("does not block text rendering while fonts load", () => {
    expect(fontFaces(fontsCss).every((block) => block.includes("font-display: swap;"))).toBe(true);
  });
});
