// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentsCss = readFileSync(new URL("components.css", import.meta.url), "utf8");
const tokensCss = readFileSync(new URL("tokens.css", import.meta.url), "utf8");

const HARD_CODED_VALUES: ReadonlyArray<readonly [string, RegExp]> = [
  ["hex color", /#[0-9a-f]{3,8}\b/gi],
  ["color function", /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi],
  [
    "named color",
    /:\s*[^;]*\b(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\b/gi,
  ],
  ["length", /(?<![\w-])\d*\.?\d+(px|rem|em|pt|vh|vw)\b/gi],
  ["font family", /IBM Plex|sans-serif|monospace|system-ui/gi],
  ["font weight", /font(-weight)?:\s*\d/gi],
];

function definedProperties(css: string): ReadonlySet<string> {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1] ?? ""));
}

function referencedProperties(css: string): ReadonlyArray<string> {
  return [...css.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1] ?? "");
}

describe("components.css", () => {
  it("publishes the port row token and uses it for port alignment", () => {
    expect(componentsCss.match(/:root\s*\{([^}]+)\}/)?.[1]).toContain(
      "--node-port-row: calc(var(--control-sm) - var(--space-0))",
    );
    expect(componentsCss.match(/\.nd-port\s*\{([^}]+)\}/)?.[1]).toContain(
      "min-height: var(--node-port-row)",
    );
    expect(componentsCss).not.toContain("--nd-port-row");
  });

  it.each(HARD_CODED_VALUES)("has no hard-coded %s", (_kind, pattern) => {
    expect(componentsCss.match(pattern) ?? []).toEqual([]);
  });

  it("only references custom properties that tokens.css or components.css define", () => {
    const defined = new Set([...definedProperties(tokensCss), ...definedProperties(componentsCss)]);

    expect(referencedProperties(componentsCss).filter((name) => !defined.has(name))).toEqual([]);
  });
});

describe("visual sizes", () => {
  it("keeps the reference minigraph width using tokens", () => {
    expect(
      Number(tokensCss.match(/--node-width: (\d+)px/)?.[1]) -
        Number(tokensCss.match(/--space-8: (\d+)px/)?.[1]),
    ).toBe(200);
    expect(componentsCss.match(/\.nd-minigraph\s*\{([^}]+)\}/)?.[1]).toContain(
      "width: calc(var(--node-width) - var(--space-8))",
    );
  });

  it.each(
    readdirSync(new URL(".", import.meta.url)).filter(
      (name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"),
    ),
  )("%s has no literal visual sizes in JSX or styles", (name) => {
    const source = readFileSync(new URL(name, import.meta.url), "utf8");
    expect(source.match(/const \w*SIZE\s*=\s*(?:\d+|\{[^}]*:\s*\d+)/g) ?? []).toEqual([]);
    expect(
      source.match(
        /(?:size|width|height|fontSize|padding|margin|borderRadius)\s*(?:=\{?|:)\s*["']?\d+(?:px|rem|em)?(?:["'};,\s])/g,
      ) ?? [],
    ).toEqual([]);
  });
});
