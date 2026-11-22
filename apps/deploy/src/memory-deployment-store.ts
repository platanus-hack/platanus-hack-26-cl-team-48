import { ok } from "@nodomics/protocol";
import type { DeploymentRecord, DeploymentStore } from "./deployment-store.ts";

export function createMemoryDeploymentStore(): DeploymentStore {
  const records = new Map<string, DeploymentRecord>();
  const ownedBy = (ownerId: string) =>
    [...records.values()].filter((record) => record.ownerId === ownerId);
  return {
    findByNode: (ownerId, flowId, nodeId) =>
      Promise.resolve(
        ok(ownedBy(ownerId).find((record) => record.flowId === flowId && record.nodeId === nodeId)),
      ),
    listByFlow: (ownerId, flowId) =>
      Promise.resolve(ok(ownedBy(ownerId).filter((record) => record.flowId === flowId))),
    get: (ownerId, id) => Promise.resolve(ok(ownedBy(ownerId).find((record) => record.id === id))),
    countByOwner: (ownerId) => Promise.resolve(ok(ownedBy(ownerId).length)),
    countAll: () => Promise.resolve(ok(records.size)),
    save: (record) => {
      records.set(record.id, record);
      return Promise.resolve(ok(undefined));
    },
    updateStatus: (id, status, updatedAt) => {
      const record = records.get(id);
      if (record !== undefined) records.set(id, { ...record, status, updatedAt });
      return Promise.resolve(ok(undefined));
    },
    remove: (id) => {
      records.delete(id);
      return Promise.resolve(ok(undefined));
    },
  };
}
