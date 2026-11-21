import type { FlowLibrary, LibraryResult } from "./flow-library.ts";
import { parseSecret } from "./parse-secret.ts";
import { createMemoryFlowLibrary } from "./memory-flow-library.ts";
import { parseSavedFlow, parseStoredFile } from "./parse-saved-flow.ts";

const DATABASE_NAME = "nodomics";
const DATABASE_VERSION = 1;
const STORES = { flows: "id", files: "key", secrets: "key" };

export function createIdbFlowLibrary(getIndexedDB: () => IDBFactory | undefined): FlowLibrary {
  const memory = createMemoryFlowLibrary();
  const database = openDatabase(getIndexedDB);
  let isUnavailable = false;
  const perform = async <T>(
    work: (db: IDBDatabase) => Promise<LibraryResult<T>>,
    fallback: () => Promise<LibraryResult<T>>,
  ) => {
    const db = await database;
    if (db !== undefined && !isUnavailable) {
      try {
        return await work(db);
      } catch {
        isUnavailable = true;
        /* Storage quota and browser policy failures are expected. */
      }
    }
    return { ...(await fallback()), issue: "unavailable" as const };
  };
  const readSecrets = () =>
    perform(
      (db) => readRecords(db, "secrets", parseSecret),
      () => memory.readSecrets(),
    );
  return {
    readSecrets,
    listSecretNames: async () => {
      const result = await readSecrets();
      return { ...result, value: result.value.map(({ name }) => name) };
    },
    saveSecret: (secret) =>
      perform(
        (db) => writeRecord(db, "secrets", { key: secret.name, ...secret }),
        () => memory.saveSecret(secret),
      ),
    deleteSecret: (name) =>
      perform(
        (db) => removeRecord(db, "secrets", name),
        () => memory.deleteSecret(name),
      ),
    listFlows: () =>
      perform(
        async (db) => {
          const result = await readRecords(db, "flows", parseSavedFlow);
          return { ...result, value: [...result.value].sort((a, b) => b.updatedAt - a.updatedAt) };
        },
        () => memory.listFlows(),
      ),
    readFlow: (id) =>
      perform(
        (db) => readRecord({ db, store: "flows", key: id, parse: parseSavedFlow }),
        () => memory.readFlow(id),
      ),
    saveFlow: (flow) =>
      perform(
        (db) => writeRecord(db, "flows", flow),
        () => memory.saveFlow(flow),
      ),
    deleteFlow: (id) =>
      perform(
        (db) => removeRecord(db, "flows", id),
        () => memory.deleteFlow(id),
      ),
    listFiles: () =>
      perform(
        (db) => readRecords(db, "files", parseStoredFile),
        () => memory.listFiles(),
      ),
    readFile: (key) =>
      perform(
        (db) => readRecord({ db, store: "files", key, parse: parseStoredFile }),
        () => memory.readFile(key),
      ),
    saveFile: (file) =>
      perform(
        (db) => writeRecord(db, "files", file),
        () => memory.saveFile(file),
      ),
    deleteFile: (key) =>
      perform(
        (db) => removeRecord(db, "files", key),
        () => memory.deleteFile(key),
      ),
  };
}

async function openDatabase(
  getIndexedDB: () => IDBFactory | undefined,
): Promise<IDBDatabase | undefined> {
  try {
    const factory = getIndexedDB();
    if (factory === undefined) return undefined;
    return await new Promise((resolve) => {
      const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        for (const [name, keyPath] of Object.entries(STORES))
          if (!request.result.objectStoreNames.contains(name))
            request.result.createObjectStore(name, { keyPath });
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = request.onblocked = () => {
        resolve(undefined);
      };
    });
  } catch {
    return undefined;
  }
}

function requestValue<T>(request: IDBRequest<T>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed"));
    };
  });
}

async function readRecords<T>(
  db: IDBDatabase,
  store: string,
  parse: (value: unknown) => T | undefined,
): Promise<LibraryResult<ReadonlyArray<T>>> {
  const raw = await requestValue(db.transaction(store).objectStore(store).getAll());
  if (!Array.isArray(raw)) return { value: [], issue: "invalid" };
  const records = raw.map(parse).filter((record) => record !== undefined);
  return {
    value: records,
    ...(records.length === raw.length ? {} : { issue: "invalid" as const }),
  };
}

async function readRecord<T>({
  db,
  store,
  key,
  parse,
}: {
  readonly db: IDBDatabase;
  readonly store: string;
  readonly key: string;
  readonly parse: (value: unknown) => T | undefined;
}): Promise<LibraryResult<T | undefined>> {
  const raw = await requestValue(db.transaction(store).objectStore(store).get(key));
  const value = parse(raw);
  return {
    value,
    ...(raw !== undefined && value === undefined ? { issue: "invalid" as const } : {}),
  };
}

function mutateRecord(
  db: IDBDatabase,
  store: string,
  mutate: (store: IDBObjectStore) => void,
): Promise<LibraryResult<void>> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    mutate(transaction.objectStore(store));
    transaction.oncomplete = () => {
      resolve({ value: undefined });
    };
    transaction.onerror = transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}
const writeRecord = (db: IDBDatabase, store: string, value: unknown) =>
  mutateRecord(db, store, (target) => {
    target.put(value);
  });
const removeRecord = (db: IDBDatabase, store: string, key: string) =>
  mutateRecord(db, store, (target) => {
    target.delete(key);
  });
