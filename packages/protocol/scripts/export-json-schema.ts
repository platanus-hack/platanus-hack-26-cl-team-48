import { mkdirSync, writeFileSync } from "node:fs";
import { exportJsonSchemas } from "../src/json-schema.ts";

const outputDir = new URL("../schema/", import.meta.url);
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  new URL("protocol.schema.json", outputDir),
  `${JSON.stringify(exportJsonSchemas(), null, 2)}\n`,
);
