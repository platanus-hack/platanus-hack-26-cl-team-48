import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { NodeFolder } from "../src/build-catalog.ts";

export const NODES_DIR = new URL("../nodes/", import.meta.url);
export const CATALOG_FILE = new URL("../src/catalog.generated.json", import.meta.url);

/** Reads every `nodes/<id>/` folder; the catalog itself is built by the pure `buildCatalog`. */
export function readNodeFolders(nodesDir: URL): NodeFolder[] {
  return readdirSync(nodesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readNodeFolder(new URL(`${entry.name}/`, nodesDir), entry.name));
}

export const readCasesFile = (nodesDir: URL, id: string) =>
  readOptionalFile(new URL(`${id}/cases.json`, nodesDir));

function readNodeFolder(folder: URL, name: string): NodeFolder {
  const mainPy = readOptionalFile(new URL("main.py", folder));
  return {
    name,
    nodeJson: readFileSync(new URL("node.json", folder), "utf8"),
    ...(mainPy === undefined ? {} : { mainPy }),
  };
}

const readOptionalFile = (file: URL) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);
