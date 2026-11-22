import type { Result } from "@nodomics/protocol";
import type { DeploymentStatus, ServiceSpec } from "./types.ts";

/** What apps/deploy remembers about a deployed service. Never holds secret values. */
export type DeploymentRecord = {
  readonly id: string;
  readonly ownerId: string;
  readonly flowId: string;
  readonly nodeId: string;
  readonly providerServiceId: string;
  readonly url?: string;
  readonly spec: ServiceSpec;
  readonly specHash: string;
  readonly status: DeploymentStatus;
  readonly updatedAt: string;
};
export type StoreError = { readonly message: string };

/** Every read is scoped to an owner, so a user never sees another user's deployments. */
export interface DeploymentStore {
  findByNode(
    ownerId: string,
    flowId: string,
    nodeId: string,
  ): Promise<Result<DeploymentRecord | undefined, StoreError>>;
  listByFlow(ownerId: string, flowId: string): Promise<Result<DeploymentRecord[], StoreError>>;
  get(ownerId: string, id: string): Promise<Result<DeploymentRecord | undefined, StoreError>>;
  countByOwner(ownerId: string): Promise<Result<number, StoreError>>;
  countAll(): Promise<Result<number, StoreError>>;
  /** Inserts the record, or replaces the one with the same id. */
  save(record: DeploymentRecord): Promise<Result<void, StoreError>>;
  remove(id: string): Promise<Result<void, StoreError>>;
  /** Changes only the status of an existing record; a removed record stays removed. */
  updateStatus(
    id: string,
    status: DeploymentStatus,
    updatedAt: string,
  ): Promise<Result<void, StoreError>>;
}
