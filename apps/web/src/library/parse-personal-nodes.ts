import { NodeManifest, parse } from "@nodomics/protocol";
import type { PersonalLibrarySnapshot } from "./personal-library.ts";

export function parsePersonalNodes(value: unknown): PersonalLibrarySnapshot {
  if (!Array.isArray(value)) return { nodes: [], issue: "invalid" };
  const nodes: NodeManifest[] = [];
  let hasInvalidEntries = false;
  for (const entry of value) {
    const parsed = parse(NodeManifest, entry);
    if (parsed.ok) nodes.push(parsed.value);
    else hasInvalidEntries = true;
  }
  return hasInvalidEntries ? { nodes, issue: "invalid" } : { nodes };
}
