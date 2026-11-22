import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { err, ok, parse, type Result } from "@nodomics/protocol";
import { Type } from "@sinclair/typebox";
import type { DeploymentRecord, DeploymentStore, StoreError } from "./deployment-store.ts";
import { DeploymentStatus, ServiceSpec } from "./types.ts";

const TABLE = "deployments";
const COLUMNS =
  "id,owner_id,flow_id,node_id,provider_service_id,url,spec,spec_hash,status,updated_at";
const DeploymentRow = Type.Object({
  id: Type.String(),
  owner_id: Type.String(),
  flow_id: Type.String(),
  node_id: Type.String(),
  provider_service_id: Type.String(),
  url: Type.Union([Type.String(), Type.Null()]),
  spec: ServiceSpec,
  spec_hash: Type.String(),
  status: DeploymentStatus,
  updated_at: Type.String(),
});
const DeploymentRows = Type.Array(DeploymentRow);

type Query<T> = PromiseLike<{ data: T; error: { message: string } | null }>;

/**
 * Only apps/deploy writes deployments, with the service role key, which skips RLS (ADR 0027 §4).
 * That is why every read filters by owner here.
 */
export function createSupabaseDeploymentStore(options: {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
}): DeploymentStore {
  const client = createClient(options.supabaseUrl, options.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows = () => client.from(TABLE).select(COLUMNS);
  return {
    findByNode: (ownerId, flowId, nodeId) =>
      readOne(
        rows().eq("owner_id", ownerId).eq("flow_id", flowId).eq("node_id", nodeId).maybeSingle(),
      ),
    listByFlow: (ownerId, flowId) => readMany(rows().eq("owner_id", ownerId).eq("flow_id", flowId)),
    get: (ownerId, id) => readOne(rows().eq("owner_id", ownerId).eq("id", id).maybeSingle()),
    countByOwner: (ownerId) => count(client, ownerId),
    countAll: () => count(client, undefined),
    save: (record) => write(client.from(TABLE).upsert(rowOf(record), { onConflict: "id" })),
    remove: (id) => write(client.from(TABLE).delete().eq("id", id)),
  };
}

async function readOne(
  query: Query<unknown>,
): Promise<Result<DeploymentRecord | undefined, StoreError>> {
  return attempt(async () => {
    const result = await query;
    if (result.error !== null) return err({ message: result.error.message });
    if (result.data === null) return ok(undefined);
    const row = parse(DeploymentRow, result.data);
    return row.ok ? ok(recordOf(row.value)) : err({ message: "Invalid stored deployment" });
  });
}

async function readMany(query: Query<unknown>): Promise<Result<DeploymentRecord[], StoreError>> {
  return attempt(async () => {
    const result = await query;
    if (result.error !== null) return err({ message: result.error.message });
    const rows = parse(DeploymentRows, result.data);
    return rows.ok ? ok(rows.value.map(recordOf)) : err({ message: "Invalid stored deployment" });
  });
}

async function count(
  client: SupabaseClient,
  ownerId: string | undefined,
): Promise<Result<number, StoreError>> {
  return attempt(async () => {
    const query = client.from(TABLE).select("id", { count: "exact", head: true });
    const result = await (ownerId === undefined ? query : query.eq("owner_id", ownerId));
    if (result.error !== null) return err({ message: result.error.message });
    return result.count === null
      ? err({ message: "Supabase did not count the deployments" })
      : ok(result.count);
  });
}

async function write(
  query: PromiseLike<{ error: { message: string } | null }>,
): Promise<Result<void, StoreError>> {
  return attempt(async () => {
    const result = await query;
    return result.error === null ? ok(undefined) : err({ message: result.error.message });
  });
}

async function attempt<T>(
  run: () => Promise<Result<T, StoreError>>,
): Promise<Result<T, StoreError>> {
  try {
    return await run();
  } catch {
    return err({ message: "Deployment storage is unavailable" });
  }
}

const recordOf = (row: (typeof DeploymentRows)["static"][number]): DeploymentRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  flowId: row.flow_id,
  nodeId: row.node_id,
  providerServiceId: row.provider_service_id,
  ...(row.url === null ? {} : { url: row.url }),
  spec: row.spec,
  specHash: row.spec_hash,
  status: row.status,
  updatedAt: row.updated_at,
});

const rowOf = (record: DeploymentRecord) => ({
  id: record.id,
  owner_id: record.ownerId,
  flow_id: record.flowId,
  node_id: record.nodeId,
  provider_service_id: record.providerServiceId,
  url: record.url ?? null,
  spec: record.spec,
  spec_hash: record.specHash,
  status: record.status,
  updated_at: record.updatedAt,
});
