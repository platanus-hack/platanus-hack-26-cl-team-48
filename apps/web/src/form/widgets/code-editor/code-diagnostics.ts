import type { NodeError } from "@nodomics/protocol";

/** The file name the custom code node gives the user's code (core.python.custom/main.py). */
const USER_CODE_FILE = "<code>";
const USER_CODE_FRAME = new RegExp(`File "${USER_CODE_FILE}", line (\\d+)`, "g");

export type CodeDiagnostic = { readonly line: number; readonly message: string };

/** Where in the user's code a Python error happened: the deepest frame of its traceback. */
export function diagnoseCodeError(error: NodeError | undefined): CodeDiagnostic[] {
  if (error?.code !== "PYTHON_EXCEPTION" || error.detail === undefined) return [];
  const deepest = [...error.detail.matchAll(USER_CODE_FRAME)].at(-1)?.[1];
  return deepest === undefined ? [] : [{ line: Number(deepest), message: error.message }];
}
