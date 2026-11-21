import type { Column } from "@nodomics/protocol";
import { MESSAGES } from "../../../messages.ts";

export type CodeEnvironment = {
  readonly inputs: ReadonlyArray<{
    readonly alias: string;
    readonly columns: ReadonlyArray<Column>;
  }>;
  readonly modules: ReadonlyArray<string>;
};

export type CompletionOption = {
  readonly label: string;
  readonly type: string;
  readonly detail?: string;
};

/** Where the completed word starts in the line, and what may complete it. */
export type LineCompletion = {
  readonly from: number;
  readonly options: ReadonlyArray<CompletionOption>;
};

const IMPORT = /^\s*(?:import|from)\s+([\w.]*)$/;
const INPUT_KEY = /inputs\[["'](\w*)$/;
const COLUMN_KEY = /inputs\[["'](\w+)["']\]\[["']([^"']*)$/;

/**
 * What the interface can complete on its own, from what it knows of the node: the modules the
 * engine can import, the node's inputs and their columns. The rest is the engine's to complete.
 */
export function completeLocally(
  lineBefore: string,
  environment: CodeEnvironment,
): LineCompletion | undefined {
  const column = COLUMN_KEY.exec(lineBefore);
  if (column !== null)
    return startingAt(lineBefore, column[2], columnOptions(environment, column[1]));
  const input = INPUT_KEY.exec(lineBefore);
  if (input !== null) return startingAt(lineBefore, input[1], inputOptions(environment));
  const module = IMPORT.exec(lineBefore);
  if (module !== null) return startingAt(lineBefore, module[1], moduleOptions(environment));
  return undefined;
}

/** Package names (`scikit-learn`) as code imports them (`scikit_learn`). */
export const toModuleNames = (packages: ReadonlyArray<string>): string[] =>
  [...new Set(packages.map((name) => name.toLowerCase().replaceAll("-", "_")))].sort();

const startingAt = (
  lineBefore: string,
  typed: string | undefined,
  options: ReadonlyArray<CompletionOption>,
): LineCompletion => ({ from: lineBefore.length - (typed ?? "").length, options });

const moduleOptions = (environment: CodeEnvironment): CompletionOption[] =>
  environment.modules.map((label) => ({ label, type: "namespace" }));

const inputOptions = (environment: CodeEnvironment): CompletionOption[] =>
  environment.inputs.map(({ alias }) => ({
    label: alias,
    type: "variable",
    detail: MESSAGES.params.codeInput,
  }));

const columnOptions = (environment: CodeEnvironment, alias: string | undefined) =>
  (environment.inputs.find((input) => input.alias === alias)?.columns ?? []).map(
    ({ name, type }): CompletionOption => ({
      label: name,
      type: "property",
      detail: MESSAGES.preview.columnTypes[type],
    }),
  );
