import { writeFileSync } from "node:fs";
import { buildCatalog } from "../src/build-catalog.ts";
import { CATALOG_FILE, NODES_DIR, readNodeFolders } from "./node-files.ts";

const catalog = buildCatalog(readNodeFolders(NODES_DIR));
if (!catalog.ok) {
  process.stderr.write(
    `Invalid nodes:\n${catalog.error.map(({ node, message }) => `  ${node}: ${message}`).join("\n")}\n`,
  );
  process.exit(1);
}
writeFileSync(CATALOG_FILE, `${JSON.stringify(catalog.value, null, 2)}\n`);
