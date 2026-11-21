import type { FlowLibrary, SavedFlow, Secret, StoredFile } from "./flow-library.ts";

export function createMemoryFlowLibrary(): FlowLibrary {
  const flows = new Map<string, SavedFlow>();
  const files = new Map<string, StoredFile>();
  const secrets = new Map<string, Secret>();
  return {
    listSecretNames: () => Promise.resolve({ value: [...secrets.keys()] }),
    readSecrets: () => Promise.resolve({ value: [...secrets.values()] }),
    saveSecret: (secret) => {
      secrets.set(secret.name, { ...secret });
      return Promise.resolve({ value: undefined });
    },
    deleteSecret: (name) => {
      secrets.delete(name);
      return Promise.resolve({ value: undefined });
    },
    listFlows: () =>
      Promise.resolve({
        value: [...flows.values()].sort((a, b) => b.updatedAt - a.updatedAt),
      }),
    readFlow: (id) => Promise.resolve({ value: flows.get(id) }),
    saveFlow: (flow) => {
      flows.set(flow.id, flow);
      return Promise.resolve({ value: undefined });
    },
    deleteFlow: (id) => {
      flows.delete(id);
      return Promise.resolve({ value: undefined });
    },
    listFiles: () => Promise.resolve({ value: [...files.values()] }),
    readFile: (key) => Promise.resolve({ value: files.get(key) }),
    saveFile: (file) => {
      files.set(file.key, file);
      return Promise.resolve({ value: undefined });
    },
    deleteFile: (key) => {
      files.delete(key);
      return Promise.resolve({ value: undefined });
    },
  };
}
