import type { CompletionItem, CompletionKind } from "@nodomics/protocol";
import type { CompletionOption } from "./local-completions.ts";

export type CodePosition = { readonly line: number; readonly column: number };

/** Asks the engine to complete the code at a position; resolves with nothing if it cannot. */
export type CompleteCode = (
  position: CodePosition & { readonly code: string },
) => Promise<ReadonlyArray<CompletionItem>>;

/** The editor's names for the icons of each kind of completion. */
const EDITOR_TYPES: Readonly<Record<CompletionKind, string>> = {
  module: "namespace",
  class: "class",
  function: "function",
  variable: "variable",
  property: "property",
  keyword: "keyword",
  other: "text",
};

export function toCodePosition(code: string, offset: number): CodePosition {
  const lines = code.slice(0, offset).split("\n");
  return { line: lines.length, column: lines.at(-1)?.length ?? 0 };
}

export const toCompletionOption = ({ label, kind, detail }: CompletionItem): CompletionOption => ({
  label,
  type: EDITOR_TYPES[kind],
  ...(detail === undefined ? {} : { detail }),
});
