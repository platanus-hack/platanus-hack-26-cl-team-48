import type { StoredFile } from "./flow-library.ts";

export const MAX_STORED_FILE_BYTES = 10 * 1024 * 1024;
export async function prepareStoredFile(deps: {
  readonly file: File;
  readonly key: string;
  readonly savedAt: number;
  readonly handle?: FileSystemFileHandle;
}): Promise<StoredFile> {
  return {
    key: deps.key,
    name: deps.file.name,
    size: deps.file.size,
    savedAt: deps.savedAt,
    ...(deps.file.size <= MAX_STORED_FILE_BYTES
      ? { bytes: new Uint8Array(await deps.file.arrayBuffer()) }
      : deps.handle === undefined
        ? {}
        : { handle: deps.handle }),
  };
}
