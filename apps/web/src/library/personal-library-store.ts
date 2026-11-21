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
  }>(() => ({ nodes: initial.nodes }));
}

function reportIssue(snapshot: PersonalLibrarySnapshot, show: (notice: LibraryNotice) => void) {
  if (snapshot.issue !== undefined) show({ tone: "warn", title: MESSAGES.library[snapshot.issue] });
}
