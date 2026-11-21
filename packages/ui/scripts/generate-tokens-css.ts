import { writeFileSync } from "node:fs";
import tokens from "../tokens.json" with { type: "json" };
import { renderTokensCss } from "./render-tokens-css.ts";

writeFileSync(new URL("../src/tokens.css", import.meta.url), renderTokensCss(tokens));
