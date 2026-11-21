import { createMemoryPersonalLibrary } from "./memory-personal-library.ts";
import { parsePersonalNodes } from "./parse-personal-nodes.ts";
import type { PersonalLibrary, PersonalLibrarySnapshot } from "./personal-library.ts";

export const PERSONAL_NODES_KEY = "nodomics.personal-nodes.v1";
type LibraryStorage = Pick<Storage, "getItem" | "setItem">;

export function createStoragePersonalLibrary(getStorage: () => LibraryStorage): PersonalLibrary {
  const loaded = readStorage(getStorage);
  let memory = createMemoryPersonalLibrary(loaded.nodes);
  let issue = loaded.issue;
  let canPersist = issue !== "unavailable";
  // Another tab (the hub's) may have added nodes since: what persists is the truth.
  const resync = () => {
    if (!canPersist) return;
    const stored = readStorage(getStorage);
    if (stored.issue === undefined) memory = createMemoryPersonalLibrary(stored.nodes);
  };
  return {
    read: () => {
      resync();
      return { ...memory.read(), ...(issue === undefined ? {} : { issue }) };
    },
    add: (manifest) => {
      const snapshot = memory.add(manifest);
      if (canPersist && !writeStorage(getStorage, snapshot)) {
        canPersist = false;
        issue = "unavailable";
      }
      return { ...snapshot, ...(issue === undefined ? {} : { issue }) };
    },
  };
}

function readStorage(getStorage: () => LibraryStorage): PersonalLibrarySnapshot {
  let stored: string | null;
  try {
    stored = getStorage().getItem(PERSONAL_NODES_KEY);
  } catch {
    return { nodes: [], issue: "unavailable" };
  }
  if (stored === null) return { nodes: [] };
  try {
    return parsePersonalNodes(JSON.parse(stored));
  } catch {
    return { nodes: [], issue: "invalid" };
  }
}

function writeStorage(
  getStorage: () => LibraryStorage,
  snapshot: PersonalLibrarySnapshot,
): boolean {
  try {
    getStorage().setItem(PERSONAL_NODES_KEY, JSON.stringify(snapshot.nodes));
    return true;
  } catch {
    return false;
  }
}
