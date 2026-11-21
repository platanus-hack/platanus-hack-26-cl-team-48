import type { NodeManifest } from "@nodomics/protocol";
import type { PersonalLibrary } from "./personal-library.ts";

export function createMemoryPersonalLibrary(
  initial: ReadonlyArray<NodeManifest> = [],
): PersonalLibrary {
  const nodes = new Map(initial.map((manifest) => [manifest.id, manifest]));
  const read = () => ({ nodes: [...nodes.values()] });
  return {
    read,
    add: (manifest) => {
      nodes.set(manifest.id, manifest);
      return read();
    },
  };
}
