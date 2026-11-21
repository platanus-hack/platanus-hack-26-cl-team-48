import { createStore } from "zustand/vanilla";
import type { LibraryResult, Secret, SecretStore } from "./flow-library.ts";

type SecretState = {
  readonly secrets: ReadonlyArray<Secret>;
  readonly refresh: () => Promise<void>;
  readonly save: (secret: Secret) => Promise<void>;
  readonly remove: (name: string) => Promise<void>;
};

export function createSecretStore(deps: {
  readonly library: SecretStore;
  readonly report: <T>(result: LibraryResult<T>) => T;
}) {
  const store = createStore<SecretState>(() => ({
    secrets: [],
    refresh: async () => {
      store.setState({ secrets: deps.report(await deps.library.readSecrets()) });
    },
    save: async (secret) => {
      deps.report(await deps.library.saveSecret(secret));
      await store.getState().refresh();
    },
    remove: async (name) => {
      deps.report(await deps.library.deleteSecret(name));
      await store.getState().refresh();
    },
  }));
  return store;
}
