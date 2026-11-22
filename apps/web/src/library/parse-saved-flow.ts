import { Flow, NodeManifest, parse } from "@nodomics/protocol";
import type { PublishedLink, SavedFlow, StoredFile } from "./flow-library.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function parseSavedFlow(value: unknown): SavedFlow | undefined {
  if (
    !isRecord(value) ||
    typeof value["id"] !== "string" ||
    typeof value["name"] !== "string" ||
    !isTime(value["updatedAt"]) ||
    !isRecord(value["files"])
  )
    return undefined;
  const files: Record<string, string> = {};
  for (const [id, key] of Object.entries(value["files"])) {
    if (typeof key !== "string") return undefined;
    files[id] = key;
  }
  const node = parseSavedNode(value["node"]);
  if (value["node"] !== undefined && node === undefined) return undefined;
  const published = parsePublishedLink(value["published"]);
  if (value["published"] !== undefined && published === undefined) return undefined;
  const flow = parse(Flow, value["flow"]);
  return flow.ok
    ? {
        id: value["id"],
        name: value["name"],
        flow: flow.value,
        files,
        ...(node === undefined ? {} : { node }),
        ...(published === undefined ? {} : { published }),
        updatedAt: value["updatedAt"],
      }
    : undefined;
}

export function parseStoredFile(value: unknown): StoredFile | undefined {
  if (
    !isRecord(value) ||
    typeof value["key"] !== "string" ||
    typeof value["name"] !== "string" ||
    !isTime(value["size"]) ||
    value["size"] < 0 ||
    !isTime(value["savedAt"])
  )
    return undefined;
  if (value["bytes"] !== undefined && !isBytes(value["bytes"])) return undefined;
  if (value["handle"] !== undefined && !isFileHandle(value["handle"])) return undefined;
  return {
    key: value["key"],
    name: value["name"],
    size: value["size"],
    savedAt: value["savedAt"],
    ...(isBytes(value["bytes"]) ? { bytes: new Uint8Array(value["bytes"]) } : {}),
    ...(isFileHandle(value["handle"]) ? { handle: value["handle"] } : {}),
  };
}

export function isFileHandle(value: unknown): value is FileSystemFileHandle {
  return (
    isRecord(value) &&
    value["kind"] === "file" &&
    typeof value["name"] === "string" &&
    typeof value["getFile"] === "function"
  );
}

function isBytes(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

function parseSavedNode(value: unknown): SavedFlow["node"] {
  if (
    !isRecord(value) ||
    typeof value["version"] !== "string" ||
    typeof value["fingerprint"] !== "string"
  )
    return undefined;
  const manifest = parse(NodeManifest, value["manifest"]);
  return manifest.ok && manifest.value.version === value["version"]
    ? { version: value["version"], fingerprint: value["fingerprint"], manifest: manifest.value }
    : undefined;
}

function parsePublishedLink(value: unknown): PublishedLink | undefined {
  if (!isRecord(value)) return undefined;
  const { publicationId, handle, slug, version, fingerprint, hasChanges } = value;
  return isText(publicationId) &&
    isText(handle) &&
    isText(slug) &&
    isText(version) &&
    isText(fingerprint) &&
    typeof hasChanges === "boolean"
    ? { publicationId, handle, slug, version, fingerprint, hasChanges }
    : undefined;
}

const isText = (value: unknown): value is string => typeof value === "string";
