// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tokens from "../tokens.json" with { type: "json" };
import { renderTokensCss, type DesignTokens } from "./render-tokens-css.ts";

const FIXTURE: DesignTokens = {
  color: {
    tokens: [{ name: "ink", value: { light: "#111111", dark: "#eeeeee" } }],
  },
  type: {
    families: { sans: '"Plex", sans-serif', mono: '"Plex Mono", monospace' },
    groups: [
      {
        family: "sans",
        styles: [
          {
            name: "display",
            fontSize: "32px",
            lineHeight: "40px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          },
          { name: "body", fontSize: "14px", lineHeight: "20px", fontWeight: 400 },
        ],
      },
    ],
  },
  spacing: { tokens: [{ name: "space-1", value: "4px" }] },
  radius: { tokens: [{ name: "radius-sm", value: "4px" }] },
  size: { tokens: [{ name: "control-md", value: "30px" }] },
  stroke: { tokens: [{ name: "stroke-hairline", value: "1px" }] },
  shadow: {
    tokens: [{ name: "shadow-node", value: { light: "0 1px 2px #0001", dark: "0 1px 2px #0006" } }],
  },
  zIndex: { tokens: [{ name: "z-panel", value: "20" }] },
};

function blockOf(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
}

describe("renderTokensCss", () => {
  it("declares light theme colors and shadows on :root", () => {
    const root = blockOf(renderTokensCss(FIXTURE), ":root");

    expect(root).toContain("--ink: #111111;");
    expect(root).toContain("--shadow-node: 0 1px 2px #0001;");
    expect(root).toContain("color-scheme: light;");
  });

  it("declares dark theme colors and shadows when data-theme is dark", () => {
    const dark = blockOf(renderTokensCss(FIXTURE), '[data-theme="dark"]');

    expect(dark).toContain("--ink: #eeeeee;");
    expect(dark).toContain("--shadow-node: 0 1px 2px #0006;");
    expect(dark).toContain("color-scheme: dark;");
  });

  it("follows the system dark preference unless the light theme is forced", () => {
    const css = renderTokensCss(FIXTURE);
    const media = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));

    expect(blockOf(media, ':root:not([data-theme="light"])')).toContain("--ink: #eeeeee;");
  });

  it("declares spacing, radius, size, stroke and z-index tokens", () => {
    const root = blockOf(renderTokensCss(FIXTURE), ":root");

    expect(root).toContain("--space-1: 4px;");
    expect(root).toContain("--radius-sm: 4px;");
    expect(root).toContain("--control-md: 30px;");
    expect(root).toContain("--stroke-hairline: 1px;");
    expect(root).toContain("--z-panel: 20;");
  });

  it("declares font families and each text style as shorthand and parts", () => {
    const root = blockOf(renderTokensCss(FIXTURE), ":root");

    expect(root).toContain('--font-sans: "Plex", sans-serif;');
    expect(root).toContain("--text-display: 600 32px/40px var(--font-sans);");
    expect(root).toContain("--text-display-size: 32px;");
    expect(root).toContain("--text-display-line: 40px;");
    expect(root).toContain("--text-display-weight: 600;");
    expect(root).toContain("--text-display-tracking: -0.01em;");
    expect(root).not.toContain("--text-body-tracking");
  });

  it("matches the committed tokens.css", () => {
    const committed = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

    expect(committed).toBe(renderTokensCss(tokens));
  });
});
