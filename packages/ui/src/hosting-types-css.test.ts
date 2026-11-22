// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const componentsCss = readFileSync(new URL("components.css", import.meta.url), "utf8");

it.each(["repo", "service"])("colors the %s data type like the other types", (type) => {
  expect(componentsCss).toMatch(new RegExp(`\\.nd-type-${type}\\s*\\{`));
});
