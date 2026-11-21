import { SOURCE_FILE_TYPES } from "./source-file-types.ts";
import { isFileHandle } from "./parse-saved-flow.ts";

type PickerWindow = Window & {
  readonly showOpenFilePicker: (options: unknown) => Promise<unknown>;
};
export function hasFilePicker(browser: Window): browser is PickerWindow {
  return "showOpenFilePicker" in browser && typeof browser.showOpenFilePicker === "function";
}
export async function pickSourceFile(browser: PickerWindow) {
  const handles = await browser.showOpenFilePicker({
    multiple: false,
    types: [{ accept: SOURCE_FILE_TYPES }],
  });
  if (!Array.isArray(handles) || !isFileHandle(handles[0])) return undefined;
  return { handle: handles[0], file: await handles[0].getFile() };
}
