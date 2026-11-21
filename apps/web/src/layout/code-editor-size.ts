import { createContext, use } from "react";
import { DEFAULT_WORKSPACE_PREFERENCES } from "./workspace-preferences.ts";

export type CodeEditorSize = {
  /** In rows of `--control-lg`. */
  readonly rows: number;
  readonly onResize: (rows: number) => void;
};

/** The height chosen for code editors, a workspace preference shared by every code parameter. */
export const CodeEditorSizeContext = createContext<CodeEditorSize>({
  rows: DEFAULT_WORKSPACE_PREFERENCES.codeEditorRows,
  onResize: () => undefined,
});

export const useCodeEditorSize = () => use(CodeEditorSizeContext);
