import { describe, expect, it } from "vitest";
import {
  createStorageWorkspacePreferences,
  WORKSPACE_PREFERENCES_KEY,
} from "./storage-workspace-preferences.ts";
import { DEFAULT_WORKSPACE_PREFERENCES } from "./workspace-preferences.ts";

const STORED = {
  theme: "system",
  isSidePanelOpen: true,
  sideSection: "nodes",
  isParamsOpen: true,
  previewLocation: "nodes",
  preview: { height: 40, mode: "expanded" },
};

const readStored = (value: string | null) =>
  createStorageWorkspacePreferences(() => ({
    getItem: (key: string) => (key === WORKSPACE_PREFERENCES_KEY ? value : null),
    setItem: () => undefined,
  })).read();

describe("workspace preferences storage", () => {
  it("persists and restores theme, panels, side section, preview location and the sizes chosen", () => {
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
      isSidePanelOpen: false,
      sideSection: "secrets" as const,
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
    '{"theme":"dark","isSidePanelOpen":true,"isParamsOpen":true,"previewLocation":"aside","preview":{"height":40,"mode":"expanded"}}',
    '{"theme":"dark","isSidePanelOpen":true,"isParamsOpen":true,"previewLocation":"panel","preview":{"height":40,"mode":"expanded"},"paramsWidth":40}',
    '{"theme":"dark","isSidePanelOpen":true,"isParamsOpen":true,"previewLocation":"panel","preview":{"height":40,"mode":"expanded"},"codeEditorRows":"x"}',
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
      isSidePanelOpen: false,
      preview: { height: 40, mode: "expanded" },
    });
  });
  it("defaults to the nodes section, shown, when nothing is stored", () => {
    const preferences = readStored(null);

    expect({
      section: preferences.sideSection,
      isOpen: preferences.isSidePanelOpen,
    }).toEqual({ section: "nodes", isOpen: true });
  });
  it.each(["nodes", "my-nodes", "data", "secrets", "agent"] as const)(
    "restores the %s side section",
    (sideSection) => {
      const preferences = readStored(JSON.stringify({ ...STORED, sideSection }));

      expect(preferences.sideSection).toBe(sideSection);
    },
  );
  it.each([undefined, "hub", "flows", 3, null])(
    "falls back to the nodes section for the stored side section %s",
    (sideSection) => {
      const preferences = readStored(JSON.stringify({ ...STORED, theme: "dark", sideSection }));

      expect({ theme: preferences.theme, section: preferences.sideSection }).toEqual({
        theme: "dark",
        section: "nodes",
      });
    },
  );
  it("reads a legacy hidden library as a hidden side panel", () => {
    const legacy = JSON.stringify({
      theme: "system",
      isLibraryOpen: false,
      isParamsOpen: true,
      previewLocation: "nodes",
      preview: { height: 40, mode: "expanded" },
    });

    const preferences = readStored(legacy);

    expect(preferences.isSidePanelOpen).toBe(false);
  });
  it("prefers the side panel choice over a legacy library choice", () => {
    const preferences = readStored(
      JSON.stringify({ ...STORED, isLibraryOpen: false, isSidePanelOpen: true }),
    );

    expect(preferences.isSidePanelOpen).toBe(true);
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
