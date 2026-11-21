import type { Flow, NodeManifest } from "@nodomics/protocol";

export type SavedFlow = {
  readonly id: string;
  readonly name: string;
  readonly flow: Flow;
  readonly files: Readonly<Record<string, string>>;
  readonly updatedAt: number;
  readonly node?: {
    readonly version: string;
    readonly fingerprint: string;
    readonly manifest: NodeManifest;
  };
};
export type StoredFile = {
  readonly key: string;
  readonly name: string;
  readonly size: number;
  readonly savedAt: number;
  readonly bytes?: Uint8Array;
  readonly handle?: FileSystemFileHandle;
};
export type LibraryResult<T> = { readonly value: T; readonly issue?: "invalid" | "unavailable" };
export type Secret = { readonly name: string; readonly value: string };
export interface SecretStore {
  listSecretNames(): Promise<LibraryResult<ReadonlyArray<string>>>;
  readSecrets(): Promise<LibraryResult<ReadonlyArray<Secret>>>;
  saveSecret(secret: Secret): Promise<LibraryResult<void>>;
  deleteSecret(name: string): Promise<LibraryResult<void>>;
}
export interface FlowLibrary extends SecretStore {
  listFlows(): Promise<LibraryResult<ReadonlyArray<SavedFlow>>>;
  readFlow(id: string): Promise<LibraryResult<SavedFlow | undefined>>;
  saveFlow(flow: SavedFlow): Promise<LibraryResult<void>>;
  deleteFlow(id: string): Promise<LibraryResult<void>>;
  listFiles(): Promise<LibraryResult<ReadonlyArray<StoredFile>>>;
  readFile(key: string): Promise<LibraryResult<StoredFile | undefined>>;
  saveFile(file: StoredFile): Promise<LibraryResult<void>>;
  deleteFile(key: string): Promise<LibraryResult<void>>;
}
