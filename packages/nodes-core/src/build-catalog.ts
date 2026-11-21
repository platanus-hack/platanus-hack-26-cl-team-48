import { err, NodeManifest, ok, parse, type Result } from "@nodomics/protocol";
import { isRecord } from "./is-record.ts";

/** The files of one `nodes/<id>/` folder, already read from disk. */
export type NodeFolder = {
  readonly name: string;
  readonly nodeJson: string;
  readonly mainPy?: string;
};

export type CatalogIssue = { readonly node: string; readonly message: string };

/** Turns the node folders into the catalog of manifests, sorted by id. */
export function buildCatalog(
  folders: readonly NodeFolder[],
): Result<NodeManifest[], CatalogIssue[]> {
  const results = folders.map(buildManifest);
  const issues = results.flatMap((result) => (result.ok ? [] : result.error));
  return issues.length > 0
    ? err(issues)
    : ok(results.flatMap((result) => (result.ok ? [result.value] : [])).sort(byId));
}

function buildManifest(folder: NodeFolder): Result<NodeManifest, CatalogIssue[]> {
  const manifest = parseJson(folder.nodeJson);
  const withCode = manifest.ok ? embedPythonCode(manifest.value, folder.mainPy) : manifest;
  const parsed = withCode.ok ? parseManifest(withCode.value) : withCode;
  const named = parsed.ok ? checkFolderName(parsed.value, folder.name) : parsed;
  return named.ok ? named : err(named.error.map((message) => ({ node: folder.name, message })));
}

function parseJson(text: string): Result<unknown, string[]> {
  try {
    return ok(JSON.parse(text));
  } catch (error) {
    return err([`node.json is not valid JSON: ${String(error)}`]);
  }
}

function embedPythonCode(manifest: unknown, mainPy: string | undefined): Result<unknown, string[]> {
  if (!isRecord(manifest) || !isRecord(manifest["impl"])) return ok(manifest);
  const impl = manifest["impl"];
  if ("code" in impl) return err(["impl.code belongs in main.py, not node.json"]);
  if (impl["kind"] !== "python") {
    return mainPy === undefined ? ok(manifest) : err(["only Python nodes have a main.py"]);
  }
  if (mainPy === undefined) return err(["a Python node needs a main.py"]);
  return ok({ ...manifest, impl: { ...impl, code: mainPy } });
}

function parseManifest(manifest: unknown): Result<NodeManifest, string[]> {
  const parsed = parse(NodeManifest, manifest);
  return parsed.ok
    ? parsed
    : err(parsed.error.map(({ path, message }) => `${path || "/"}: ${message}`));
}

function checkFolderName(manifest: NodeManifest, name: string): Result<NodeManifest, string[]> {
  return manifest.id === name
    ? ok(manifest)
    : err([`the folder name must equal the node id "${manifest.id}"`]);
}

const byId = (a: NodeManifest, b: NodeManifest) => a.id.localeCompare(b.id);
