import { captureSourceScope } from "../library/source-scope.ts";
import { prepareStoredFile } from "../library/stored-file.ts";
import { useCallback } from "react";
import { useAppStores, useShowNotice } from "../app-context.ts";
import { MESSAGES } from "../messages.ts";
import { useEngineConnection } from "./engine-connection.ts";

export type AddedSource = { readonly sourceId: string; readonly name: string };

/** Runs the flow at its latest revision; `undefined` while there is no engine to run it. */
export function useRunFlow(): ((targets?: string[]) => Promise<void>) | undefined {
  const connection = useEngineConnection();
  const showNotice = useShowNotice();
  const run = useCallback(
    async (targets?: string[]) => {
      if (connection === undefined) return;
      try {
        const rev = await connection.flushFlow();
        if (rev !== undefined) await connection.session.run(rev, targets);
      } catch {
        showNotice({ tone: "error", title: MESSAGES.run.failed });
      }
    },
    [connection, showNotice],
  );
  return connection === undefined ? undefined : run;
}

/** Hands a file to the engine (`source.add`); the interface keeps only the returned `sourceId`. */
export function useAddSource():
  ((file: File, handle?: FileSystemFileHandle) => Promise<AddedSource | undefined>) | undefined {
  const connection = useEngineConnection();
  const showNotice = useShowNotice();
  const { savedFlowStore } = useAppStores();
  const addSource = useCallback(
    async (file: File, handle?: FileSystemFileHandle) => {
      if (connection === undefined) return undefined;
      const isCurrent = captureSourceScope(savedFlowStore);
      try {
        const added = await connection.session.addSource({
          name: file.name,
          file: new Uint8Array(await file.arrayBuffer()),
        });
        if (!isCurrent()) return undefined;
        const stored = await prepareStoredFile({
          file,
          key: `file_${crypto.randomUUID()}`,
          savedAt: Date.now(),
          ...(handle === undefined ? {} : { handle }),
        });
        const state = savedFlowStore.getState();
        state.report(await state.library.saveFile(stored));
        if (!isCurrent()) return undefined;
        state.trackSource(added.sourceId, stored.key);
        await state.refresh();
        return added;
      } catch {
        showNotice({ tone: "error", title: MESSAGES.files.sourceFailed, detail: file.name });
        return undefined;
      }
    },
    [connection, showNotice, savedFlowStore],
  );
  return connection === undefined ? undefined : addSource;
}
