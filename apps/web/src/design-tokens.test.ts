// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_DIR = fileURLToPath(new URL(".", import.meta.url));
const UI_SOURCE_DIR = fileURLToPath(new URL("../../../packages/ui/src/", import.meta.url));

/** Invariant 7: every color, size, radius and font comes from the design system's tokens. */
const HARD_CODED_VALUES: ReadonlyArray<readonly [string, RegExp]> = [
  ["hex color", /#[0-9a-f]{3,8}\b/gi],
  ["color function", /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi],
  ["length", /(?<![\w-])\d*\.?\d+(px|rem|em|pt|vh|vw)\b/gi],
  ["font family", /IBM Plex|sans-serif|monospace|system-ui/gi],
  ["font weight", /font(-weight)?:\s*\d/gi],
];

const STYLED_FILE = /\.(css|tsx)$/;
const TEST_FILE = /\.test\.tsx?$/;

function listStyledFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listStyledFiles(path);
    return STYLED_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : [];
  });
}

const definedProperties = (css: string) =>
  [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] ?? "");

const referencedProperties = (text: string) =>
  [...text.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1] ?? "");

const files = listStyledFiles(SOURCE_DIR).map((path) => ({
  path: path.slice(SOURCE_DIR.length),
  text: readFileSync(path, "utf8"),
}));

describe("apps/web styles", () => {
  it("scans the app's stylesheets", () => {
    expect(files.filter((file) => file.path.endsWith(".css")).length).toBeGreaterThan(0);
  });

  it.each(HARD_CODED_VALUES)("has no hard-coded %s", (_kind, pattern) => {
    expect(
      files.flatMap((file) =>
        (file.text.match(pattern) ?? []).map((value) => `${file.path}: ${value}`),
      ),
    ).toEqual([]);
  });

  it("only references custom properties that the design system or the app define", () => {
    const defined = new Set([
      ...["tokens.css", "components.css"].flatMap((name) =>
        definedProperties(readFileSync(join(UI_SOURCE_DIR, name), "utf8")),
      ),
      ...files.flatMap((file) => definedProperties(file.text)),
    ]);

    expect(
      files.flatMap((file) =>
        referencedProperties(file.text)
          .filter((name) => !defined.has(name))
          .map((name) => `${file.path}: ${name}`),
      ),
    ).toEqual([]);
  });
});
