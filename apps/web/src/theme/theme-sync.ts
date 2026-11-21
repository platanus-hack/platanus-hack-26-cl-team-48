import { WORKSPACE_PREFERENCES_KEY } from "../layout/storage-workspace-preferences.ts";
import type { Theme } from "../layout/workspace-preferences.ts";

type EventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

/** Follows the theme another tab (the editor) stores; returns how to stop following it. */
export function followStoredTheme(
  target: EventTarget,
  readTheme: () => Theme,
  apply: (theme: Theme) => void,
): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_PREFERENCES_KEY) apply(readTheme());
  };
  target.addEventListener("storage", onStorage);
  return () => {
    target.removeEventListener("storage", onStorage);
  };
}
