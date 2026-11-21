import type { NodeManifest } from "@nodomics/protocol";

export type PersonalLibrarySnapshot = {
  readonly nodes: ReadonlyArray<NodeManifest>;
  readonly issue?: "invalid" | "unavailable";
};

export interface PersonalLibrary {
  read(): PersonalLibrarySnapshot;
  add(manifest: NodeManifest): PersonalLibrarySnapshot;
}
