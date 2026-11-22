import type { Flow, Result } from "@nodomics/protocol";
import type { UserIdentity } from "./identity.ts";

export type StoreError = { readonly message: string };
export type FlowDocument = {
  readonly id: string;
  readonly name: string;
  readonly flow: Flow;
  readonly files: Readonly<Record<string, string>>;
  readonly updatedAt: number;
} & Readonly<Record<string, unknown>>;
export type Draft = {
  readonly id: string;
  readonly flowId: string;
  readonly baseRevision: string;
  readonly flow: Flow;
};
export interface FlowRepository {
  read(flowId: string): Promise<Result<FlowDocument | undefined, StoreError>>;
  search(
    query: string,
  ): Promise<Result<readonly { readonly id: string; readonly name: string }[], StoreError>>;
  write(document: FlowDocument): Promise<Result<void, StoreError>>;
}
export interface DraftRepository {
  create(draft: Draft): Promise<Result<void, StoreError>>;
  read(draftId: string): Promise<Result<Draft | undefined, StoreError>>;
  update(draft: Draft): Promise<Result<void, StoreError>>;
  remove(draftId: string): Promise<Result<void, StoreError>>;
}
export type Stores = { readonly flows: FlowRepository; readonly drafts: DraftRepository };
export type StoresFor = (identity: UserIdentity) => Stores;
