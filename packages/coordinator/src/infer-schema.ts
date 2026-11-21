import type { NepParams, NepResult } from "@nodomics/protocol";
import type { EngineState } from "./engine-state.ts";
import { buildInferQuery } from "./infer-query.ts";
import { declaredColumns } from "./output-contract.ts";
import { originOf } from "./relayed-port.ts";
import { requireNode, requireSession } from "./session.ts";
import { withTemporarySql } from "./temporary-sql.ts";

/** `schema.infer`: the columns of a node's port, read from the cache or from a `LIMIT 0` query. */
export async function inferSchema(
  state: EngineState,
  asked: NepParams<"schema.infer">,
): Promise<NepResult<"schema.infer">> {
  const session = requireSession(state);
  const { analysis } = session;
  requireNode(session, asked.nodeId);
  const { node: nodeId, port } = originOf(analysis.graph, { node: asked.nodeId, port: asked.port });
  const node = requireNode(session, nodeId);
  const cached = state.store.get(analysis.keys.get(node.id) ?? "")?.outputs[port];
  if (cached !== undefined) return { ok: true, columns: cached.schema };
  const declared = declaredColumns(node, port);
  if (declared !== undefined) return { ok: true, columns: [...declared] };
  const query = buildInferQuery(analysis.graph, node.id, (id) =>
    state.store.has(analysis.keys.get(id) ?? ""),
  );
  if (!query.ok) return query;
  const columns = await withTemporarySql(state, { ...query.value, keys: analysis.keys }, (ref) =>
    Promise.resolve(ref.schema),
  );
  return columns.ok ? { ok: true, columns: columns.value } : columns;
}
