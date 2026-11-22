import { useEffect, useState } from "react";
import {
  createStorageWorkspacePreferences,
  readPreferences,
} from "../layout/storage-workspace-preferences.ts";
import type { Theme } from "../layout/workspace-preferences.ts";
import { ThemeSwitch } from "./ThemeSwitch.tsx";
import { followStoredTheme } from "./theme-sync.ts";

const storage = () => window.localStorage;
const readTheme = () => readPreferences(storage).theme;

/** The theme switch outside the editor: it shares the editor's stored choice, in both directions. */
export function StoredThemeControl() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => followStoredTheme(window, readTheme, setTheme), []);
  const choose = (next: Theme) => {
    createStorageWorkspacePreferences(storage).write({ ...readPreferences(storage), theme: next });
    setTheme(next);
  };
  return <ThemeSwitch theme={theme} onChange={choose} />;
}
