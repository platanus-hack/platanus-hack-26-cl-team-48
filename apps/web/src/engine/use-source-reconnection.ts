import { captureSourceScope } from "../library/source-scope.ts";
import { useCallback, useEffect } from "react";
import { useStore } from "zustand";
import { useAppStores, useCatalog } from "../app-context.ts";
import {
  planSourceReconnection,
  sourceTargets,
  rebindSourceTargets,
} from "../library/source-reconnection.ts";
import { readPermittedFile, requestFileAccess } from "../library/file-permission.ts";
import type { StoredFile } from "../library/flow-library.ts";
import { useEngineConnection, type EngineConnection } from "./engine-connection.ts";
import type { AppStores } from "../app-stores.ts";

export function useSourceReconnection(): void {
  const stores = useAppStores();
  const connection = useEngineConnection();
  const catalog = useCatalog();
  const generation = useStore(stores.savedFlowStore, (state) => state.generation);
  const sessionEpoch = useStore(stores.savedFlowStore, (state) => state.sessionEpoch);
  useEffect(() => {
    if (connection === undefined) return;
    let isActive = true;
    const isCurrent = captureSourceScope(stores.savedFlowStore);
    const attempted = new Set<string>();
    const reconnect = () => {
      const state = stores.savedFlowStore.getState();
      const ids = planSourceReconnection({
        flow: stores.flowStore.getState().state.flow,
        catalog,
        sessionSources: state.sessionSources,
      }).filter((id) => !attempted.has(id));
      ids.forEach((id) => {
        attempted.add(id);
      });
      void restoreSources({ stores, connection, isActive: () => isActive && isCurrent() }, ids);
    };
    reconnect();
    const unsubscribe = stores.flowStore.subscribe(reconnect);
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [stores, connection, catalog, generation, sessionEpoch]);
}

type RestoreSource = {
  readonly stores: AppStores;
  readonly connection: EngineConnection;
  readonly id: string;
  readonly isActive: () => boolean;
};
async function restoreSource(deps: RestoreSource) {
  const state = deps.stores.savedFlowStore.getState();
  const key = state.files[deps.id];
  if (key === undefined) return;
  const file = state.report(await state.library.readFile(key));
  if (file === undefined || !deps.isActive()) return;
  const bytes = await readStoredBytes(file);
  if (bytes !== undefined && deps.isActive()) return uploadStoredSource(deps, file, bytes);
}
async function readStoredBytes(file: StoredFile): Promise<Uint8Array | undefined> {
  if (file.bytes !== undefined) return file.bytes;
  if (file.handle === undefined) return undefined;
  const permitted = await readPermittedFile(file.handle);
  return permitted === undefined ? undefined : new Uint8Array(await permitted.arrayBuffer());
}
type Rebinding = { readonly oldId: string; readonly newId: string; readonly fileKey: string };
async function uploadStoredSource(
  deps: RestoreSource,
  file: StoredFile,
  bytes: Uint8Array,
): Promise<Rebinding | undefined> {
  const added = await deps.connection.session.addSource({ name: file.name, file: bytes });
  return deps.isActive() ? { oldId: deps.id, newId: added.sourceId, fileKey: file.key } : undefined;
}
async function restoreSources(deps: Omit<RestoreSource, "id">, ids: ReadonlyArray<string>) {
  const rebound = await Promise.all(
    ids.map(async (id) => {
      try {
        return await restoreSource({ ...deps, id });
      } catch {
        return undefined;
      }
    }),
  );
  if (deps.isActive())
    commitRebindings(
      deps.stores,
      rebound.filter((item) => item !== undefined),
    );
}
function commitRebindings(stores: AppStores, rebound: ReadonlyArray<Rebinding>) {
  if (rebound.length === 0) return;
  for (const item of rebound)
    stores.savedFlowStore.getState().trackSource(item.newId, item.fileKey);
  stores.flowStore.getState().dispatch({
    type: "sources.rebind",
    targets: rebindSourceTargets(
      sourceTargets(
        stores.flowStore.getState().state.flow,
        stores.engineStore.getState().state.catalog,
      ),
      Object.fromEntries(rebound.map(({ oldId, newId }) => [oldId, newId])),
    ),
  });
}
async function rebindSource(deps: RestoreSource, file: StoredFile, bytes: Uint8Array) {
  const rebound = await uploadStoredSource(deps, file, bytes);
  if (rebound !== undefined && deps.isActive()) commitRebindings(deps.stores, [rebound]);
}

export function usePendingSource(id: string) {
  const stores = useAppStores();
  const connection = useEngineConnection();
  const state = useStore(stores.savedFlowStore);
  const file = state.sessionSources.has(id)
    ? undefined
    : state.storedFiles.find(({ key }) => key === state.files[id]);
  const permit = useCallback(async () => {
    if (file?.handle === undefined || connection === undefined) return;
    const isActive = captureSourceScope(stores.savedFlowStore);
    try {
      const permitted = await requestFileAccess(file.handle);
      if (permitted !== undefined)
        await rebindSource(
          {
            stores,
            connection,
            id,
            isActive,
          },
          file,
          new Uint8Array(await permitted.arrayBuffer()),
        );
    } catch {
      /* A revoked handle remains pending so the user can choose the file again. */
    }
  }, [file, connection, id, stores]);
  return { file, permit };
}
