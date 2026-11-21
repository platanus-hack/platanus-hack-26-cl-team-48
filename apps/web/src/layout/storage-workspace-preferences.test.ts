import { describe, expect, it } from "vitest";
import {
  createStorageWorkspacePreferences,
  WORKSPACE_PREFERENCES_KEY,
} from "./storage-workspace-preferences.ts";
import { DEFAULT_WORKSPACE_PREFERENCES } from "./workspace-preferences.ts";

describe("workspace preferences storage", () => {
  it("persists and restores theme, panels, preview location and the sizes chosen", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const preferences = {
      ...DEFAULT_WORKSPACE_PREFERENCES,
      theme: "dark" as const,
      isLibraryOpen: false,
      isParamsOpen: false,
      previewLocation: "panel" as const,
      preview: { height: 55, mode: "maximized" as const },
      paramsWidth: 1.6,
      codeEditorRows: 18,
    };
    createStorageWorkspacePreferences(() => storage).write(preferences);
    expect(createStorageWorkspacePreferences(() => storage).read()).toEqual(preferences);
  });
  it("uses memory when storage is unavailable", () => {
    const storage = createStorageWorkspacePreferences(() => {
      throw new Error("denied");
    });
    storage.write({ ...DEFAULT_WORKSPACE_PREFERENCES, theme: "light" });
    expect(storage.read().theme).toBe("light");
  });
  it.each([
    "{",
    '{"theme":"invalid"}',
    '{"theme":"dark","preview":{"height":999,"mode":"expanded"}}',
    '{"theme":"dark","isLibraryOpen":true,"isParamsOpen":true,"previewLocation":"aside","preview":{"height":40,"mode":"expanded"}}',
    '{"theme":"dark","isLibraryOpen":true,"isParamsOpen":true,"previewLocation":"panel","preview":{"height":40,"mode":"expanded"},"paramsWidth":40}',
    '{"theme":"dark","isLibraryOpen":true,"isParamsOpen":true,"previewLocation":"panel","preview":{"height":40,"mode":"expanded"},"codeEditorRows":"x"}',
  ])("rejects invalid stored data %s", (value) => {
    expect(
      createStorageWorkspacePreferences(() => ({
        getItem: () => value,
        setItem: () => undefined,
      })).read(),
    ).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
  });
  it("keeps earlier preferences that did not choose a preview location yet", () => {
    const stored = JSON.stringify({
      theme: "dark",
      isLibraryOpen: false,
      isParamsOpen: true,
      preview: { height: 40, mode: "expanded" },
    });
    expect(
      createStorageWorkspacePreferences(() => ({
        getItem: () => stored,
        setItem: () => undefined,
      })).read(),
    ).toEqual({
      ...DEFAULT_WORKSPACE_PREFERENCES,
      theme: "dark",
      isLibraryOpen: false,
      preview: { height: 40, mode: "expanded" },
    });
  });
  it("keeps the latest value after a failed write", () => {
    const storage = createStorageWorkspacePreferences(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    }));
    storage.write({ ...DEFAULT_WORKSPACE_PREFERENCES, theme: "dark" });
    expect(storage.read().theme).toBe("dark");
    expect(WORKSPACE_PREFERENCES_KEY).toContain("nodomics");
  });
});
