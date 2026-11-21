import { useEffect, useState } from "react";
import type { WorkspacePreferenceStorage } from "./workspace-preferences.ts";
export function useWorkspacePreferences(storage: WorkspacePreferenceStorage) {
  const [preferences, setPreferences] = useState(() => storage.read());
  useEffect(() => {
    storage.write(preferences);
  }, [preferences, storage]);
  return { preferences, setPreferences };
}
