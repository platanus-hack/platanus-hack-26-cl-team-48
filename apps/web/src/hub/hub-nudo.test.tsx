// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));

function isHubSourceFile(fileName: string): boolean {
  return (
    (fileName.endsWith(".tsx") || fileName.endsWith(".ts") || fileName.endsWith(".css")) &&
    !fileName.includes(".test.") &&
    !fileName.includes("-fixtures.")
  );
}

describe("Hub style guidelines", () => {
  it("contains no hex colors in any source files under hub", () => {
    const hubDir = currentDir;
    const sourceFiles = readdirSync(hubDir).filter(isHubSourceFile);

    const violations = sourceFiles.flatMap((file) => {
      const content = readFileSync(join(hubDir, file), "utf8");
      const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      return hexMatches.map((match) => `${file}: ${match}`);
    });

    expect(violations).toEqual([]);
  });

  it("contains no hard-coded pixel typography in any source files under hub", () => {
    const hubDir = currentDir;
    const sourceFiles = readdirSync(hubDir).filter(isHubSourceFile);

    const violations = sourceFiles.flatMap((file) => {
      const content = readFileSync(join(hubDir, file), "utf8");
      const pxMatches = content.match(/(?:font-size|fontSize)\s*[:=]\s*["']?\d*\.?\d+px/gi) ?? [];
      const shorthandMatches = content.match(/\bfont\s*:\s*[^;\n]*\b\d+px/gi) ?? [];
      return [...pxMatches, ...shorthandMatches].map((match) => `${file}: ${match}`);
    });

    expect(violations).toEqual([]);
  });

  it("contains no handwritten font family names in any source files under hub", () => {
    const hubDir = currentDir;
    const sourceFiles = readdirSync(hubDir).filter(isHubSourceFile);

    const violations = sourceFiles.flatMap((file) => {
      const content = readFileSync(join(hubDir, file), "utf8");
      const fontMatches =
        content.match(
          /\b(IBM Plex|Newsreader|Inter|Geist|Roboto|sans-serif|monospace|system-ui)\b/gi,
        ) ?? [];
      return fontMatches.map((match) => `${file}: ${match}`);
    });

    expect(violations).toEqual([]);
  });

  it("respects prefers-reduced-motion for all transitions in hub.css", () => {
    const hubCssPath = join(currentDir, "hub.css");
    const cssContent = readFileSync(hubCssPath, "utf8");

    const hasTransitions = /\btransition\s*:/i.test(cssContent);
    const hasReducedMotionQuery =
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)/i.test(cssContent);
    const disablesTransitionInReducedMotion =
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*transition\s*:\s*none/i.test(
        cssContent,
      );

    expect(hasTransitions).toBe(true);
    expect(hasReducedMotionQuery).toBe(true);
    expect(disablesTransitionInReducedMotion).toBe(true);
  });
});
