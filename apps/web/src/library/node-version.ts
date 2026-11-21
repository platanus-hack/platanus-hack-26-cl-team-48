import type { NodeManifest } from "@nodomics/protocol";

const FIRST_VERSION = "0.1.0";

/** The version a saved flow's node carries, and what it was computed from. */
export type NodeVersion = { readonly version: string; readonly fingerprint: string };

/** The node keeps its version while its manifest is unchanged; any change raises the patch. */
export function nextNodeVersion(
  previous: NodeVersion | undefined,
  manifest: NodeManifest,
): NodeVersion {
  const fingerprint = fingerprintOf(manifest);
  if (previous === undefined) return { version: FIRST_VERSION, fingerprint };
  return previous.fingerprint === fingerprint
    ? previous
    : { version: raisePatch(previous.version), fingerprint };
}

const fingerprintOf = (manifest: NodeManifest): string =>
  JSON.stringify(sortKeys({ ...manifest, version: undefined }));

function raisePatch(version: string): string {
  const [major = "0", minor = "1", patch = "0"] = version.split(/[.-]/u);
  return `${major}.${minor}.${String(Number(patch) + 1)}`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : 1))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}
