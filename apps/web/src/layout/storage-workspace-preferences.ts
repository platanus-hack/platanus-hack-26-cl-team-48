import { PREVIEW_HEIGHT_RANGE, type PreviewSize } from "./preview-size.ts";
import {
  CODE_EDITOR_ROWS_RANGE,
  isWithinRange,
  PARAMS_WIDTH_RANGE,
  type SizeRange,
} from "./size-range.ts";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  SIDE_SECTIONS,
  type PreviewLocation,
  type SideSection,
  type WorkspacePreferences,
  type WorkspacePreferenceStorage,
} from "./workspace-preferences.ts";
export const WORKSPACE_PREFERENCES_KEY = "nodomics.workspace.v1";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;
export function createStorageWorkspacePreferences(
  getStorage: () => PreferenceStorage,
): WorkspacePreferenceStorage {
  let current = readPreferences(getStorage);
  return {
    read: () => current,
    write: (preferences) => {
      current = preferences;
      try {
        getStorage().setItem(WORKSPACE_PREFERENCES_KEY, JSON.stringify(preferences));
      } catch {
        /* Storage can be disabled or full; the session retains its preferences. */
      }
    },
  };
}
function readPreferences(getStorage: () => PreferenceStorage): WorkspacePreferences {
  try {
    return parsePreferences(JSON.parse(getStorage().getItem(WORKSPACE_PREFERENCES_KEY) ?? "null"));
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }
}
function parsePreferences(value: unknown): WorkspacePreferences {
  if (!isRecord(value)) return DEFAULT_WORKSPACE_PREFERENCES;
  const { theme, isParamsOpen } = value;
  const isSidePanelOpen = value["isSidePanelOpen"] ?? value["isLibraryOpen"];
  const sideSection = parseSideSection(value["sideSection"]);
  const preview = parsePreviewSize(value["preview"]);
  const previewLocation = parsePreviewLocation(value["previewLocation"]);
  const paramsWidth = parseSize(
    PARAMS_WIDTH_RANGE,
    value["paramsWidth"],
    DEFAULT_WORKSPACE_PREFERENCES.paramsWidth,
  );
  const codeEditorRows = parseSize(
    CODE_EDITOR_ROWS_RANGE,
    value["codeEditorRows"],
    DEFAULT_WORKSPACE_PREFERENCES.codeEditorRows,
  );
  if (
    (theme !== "light" && theme !== "dark" && theme !== "system") ||
    typeof isSidePanelOpen !== "boolean" ||
    typeof isParamsOpen !== "boolean" ||
    preview === undefined ||
    previewLocation === undefined ||
    paramsWidth === undefined ||
    codeEditorRows === undefined
  )
    return DEFAULT_WORKSPACE_PREFERENCES;
  return {
    theme,
    isSidePanelOpen,
    sideSection,
    isParamsOpen,
    previewLocation,
    preview,
    paramsWidth,
    codeEditorRows,
  };
}

/** Preferences saved before the rail existed, or with an unknown section, show the nodes. */
function parseSideSection(value: unknown): SideSection {
  return (
    SIDE_SECTIONS.find((section) => section === value) ?? DEFAULT_WORKSPACE_PREFERENCES.sideSection
  );
}

function parsePreviewSize(value: unknown): PreviewSize | undefined {
  if (!isRecord(value)) return undefined;
  const { height, mode } = value;
  return isWithinRange(PREVIEW_HEIGHT_RANGE, height) &&
    (mode === "expanded" || mode === "maximized")
    ? { height, mode }
    : undefined;
}

/** Preferences saved before the location existed keep the default one. */
function parsePreviewLocation(value: unknown): PreviewLocation | undefined {
  if (value === undefined) return DEFAULT_WORKSPACE_PREFERENCES.previewLocation;
  return value === "nodes" || value === "panel" ? value : undefined;
}

/** Preferences saved before a size could be chosen keep its default. */
function parseSize(range: SizeRange, value: unknown, fallback: number): number | undefined {
  if (value === undefined) return fallback;
  return isWithinRange(range, value) ? value : undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
