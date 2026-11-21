import { DEFAULT_PREVIEW_SIZE, type PreviewSize } from "./preview-size.ts";
export type Theme = "light" | "dark" | "system";
/** Where node results are shown: inside each node, or in the panel under the canvas. */
export type PreviewLocation = "nodes" | "panel";
/** What the side panel shows, chosen in the activity rail. */
export type SideSection = "nodes" | "flows" | "my-nodes" | "data" | "secrets" | "agent";
export const SIDE_SECTIONS: ReadonlyArray<SideSection> = [
  "nodes",
  "flows",
  "my-nodes",
  "data",
  "secrets",
  "agent",
];
export type WorkspacePreferences = {
  readonly theme: Theme;
  readonly isSidePanelOpen: boolean;
  readonly sideSection: SideSection;
  readonly isParamsOpen: boolean;
  readonly previewLocation: PreviewLocation;
  readonly preview: PreviewSize;
  /** In multiples of `--panel-min`. */
  readonly paramsWidth: number;
  /** In rows of `--control-lg`. */
  readonly codeEditorRows: number;
};
export interface WorkspacePreferenceStorage {
  read(): WorkspacePreferences;
  write(preferences: WorkspacePreferences): void;
}
export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  theme: "system",
  isSidePanelOpen: true,
  sideSection: "nodes",
  isParamsOpen: true,
  previewLocation: "nodes",
  preview: DEFAULT_PREVIEW_SIZE,
  paramsWidth: 1,
  codeEditorRows: 10,
};
