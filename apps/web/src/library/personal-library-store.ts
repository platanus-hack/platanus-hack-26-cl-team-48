import type { NodeManifest } from "@nodomics/protocol";
import { createStore } from "zustand/vanilla";
import type { NoticeProps } from "@nodomics/ui";
import { MESSAGES } from "../messages.ts";
import type { PersonalLibrary, PersonalLibrarySnapshot } from "./personal-library.ts";

type LibraryNotice = Pick<NoticeProps, "tone" | "title" | "detail">;

export function createPersonalLibraryStore(
  library: PersonalLibrary,
  show: (notice: LibraryNotice) => void,
) {
  const initial = library.read();
  reportIssue(initial, show);
  return createStore<{
    readonly nodes: ReadonlyArray<NodeManifest>;
    readonly install: (manifests: ReadonlyArray<NodeManifest>) => void;
    /** Reads the library again, to pick up nodes another tab installed. */
    readonly reload: () => void;
  }>((set) => ({
    nodes: initial.nodes,
    install: (manifests) => {
      manifests.forEach((manifest) => library.add(manifest));
      const snapshot = library.read();
      reportIssue(snapshot, show);
      set({ nodes: snapshot.nodes });
    },
    reload: () => {
      const snapshot = library.read();
      reportIssue(snapshot, show);
      set({ nodes: snapshot.nodes });
    },
  }));
}

function reportIssue(snapshot: PersonalLibrarySnapshot, show: (notice: LibraryNotice) => void) {
  if (snapshot.issue !== undefined) show({ tone: "warn", title: MESSAGES.library[snapshot.issue] });
}
