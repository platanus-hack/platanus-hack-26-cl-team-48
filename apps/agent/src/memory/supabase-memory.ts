import { err, ok, type Result } from "@nodomics/protocol";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Edge, Episode, MemoryError, MemoryPort } from "./memory-port.ts";
import { edgesValidAt } from "./temporal-graph.ts";

const EdgeRow = Type.Object({
  id: Type.String(),
  src: Type.String(),
  dst: Type.String(),
  relation: Type.String(),
  valid_from: Type.String(),
  valid_to: Type.Union([Type.String(), Type.Null()]),
});

const EpisodeRow = Type.Object({
  id: Type.String(),
  at: Type.String(),
  actor_id: Type.String(),
  kind: Type.Union([
    Type.Literal("mcp_call"),
    Type.Literal("message"),
    Type.Literal("proposal_decision"),
  ]),
  entity_ids: Type.Array(Type.String()),
  payload: Type.Record(Type.String(), Type.Unknown()),
});

type Reply = { readonly data: unknown; readonly error: { readonly message: string } | null };
type Outcome<T> = Result<T, MemoryError>;

const storeFailed = (message: string): Outcome<never> => err({ code: "STORE_FAILED", message });

function parseRow<S extends TSchema>(schema: S, row: unknown): Outcome<Static<S>> {
  return Value.Check(schema, row)
    ? ok(row)
    : err({ code: "MALFORMED_ROW", message: "Row does not match the expected schema" });
}

function parseRows<S extends TSchema>(schema: S, rows: unknown): Outcome<readonly Static<S>[]> {
  if (!Array.isArray(rows))
    return err({ code: "MALFORMED_ROW", message: "Expected a list of rows" });
  const values: Static<S>[] = [];
  for (const row of rows) {
    const parsed = parseRow(schema, row);
    if (!parsed.ok) return parsed;
    values.push(parsed.value);
  }
  return ok(values);
}

const toEdge = (row: Static<typeof EdgeRow>): Edge => ({
  id: row.id,
  src: row.src,
  dst: row.dst,
  relation: row.relation,
  validFrom: row.valid_from,
  validTo: row.valid_to,
});

const toEpisode = (row: Static<typeof EpisodeRow>): Episode => ({
  id: row.id,
  at: row.at,
  actorId: row.actor_id,
  kind: row.kind,
  entityIds: row.entity_ids,
  payload: row.payload,
});

async function write(query: PromiseLike<Reply>): Promise<Outcome<void>> {
  const { error } = await query;
  return error ? storeFailed(error.message) : ok(undefined);
}

async function readEdges(client: SupabaseClient, column: "src" | "dst", id: string) {
  const { data, error } = await client.from("agent_edges").select("*").eq(column, id);
  return error ? storeFailed(error.message) : parseRows(EdgeRow, data);
}

async function edgesTouching(
  client: SupabaseClient,
  entityId: string,
): Promise<Outcome<readonly Edge[]>> {
  const [asSrc, asDst] = await Promise.all([
    readEdges(client, "src", entityId),
    readEdges(client, "dst", entityId),
  ]);
  if (!asSrc.ok) return asSrc;
  if (!asDst.ok) return asDst;
  const byId = new Map([...asSrc.value, ...asDst.value].map((row) => [row.id, toEdge(row)]));
  return ok([...byId.values()]);
}

async function openEdge(client: SupabaseClient, edge: Parameters<MemoryPort["openEdge"]>[0]) {
  const row = { src: edge.src, dst: edge.dst, relation: edge.relation, valid_from: edge.at };
  const { data, error }: Reply = await client.from("agent_edges").insert(row).select().single();
  if (error) return storeFailed(error.message);
  const parsed = parseRow(EdgeRow, data);
  return parsed.ok ? ok(toEdge(parsed.value)) : parsed;
}

async function closeEdge(client: SupabaseClient, id: string, at: string): Promise<Outcome<void>> {
  const query = client.from("agent_edges").update({ valid_to: at }).eq("id", id).select("id");
  const { data, error }: Reply = await query;
  if (error) return storeFailed(error.message);
  return Array.isArray(data) && data.length > 0
    ? ok(undefined)
    : err({ code: "NOT_FOUND", message: `Unknown edge ${id}` });
}

async function episodesFor(client: SupabaseClient, entityId: string) {
  const query = client
    .from("agent_episodes")
    .select("*")
    .contains("entity_ids", [entityId])
    .order("at");
  const { data, error } = await query;
  if (error) return storeFailed(error.message);
  const parsed = parseRows(EpisodeRow, data);
  return parsed.ok ? ok(parsed.value.map(toEpisode)) : parsed;
}

const episodeToRow = (episode: Episode) => ({
  id: episode.id,
  at: episode.at,
  actor_id: episode.actorId,
  kind: episode.kind,
  entity_ids: episode.entityIds,
  payload: episode.payload,
});

export function createSupabaseMemory(client: SupabaseClient): MemoryPort {
  return {
    recordEpisode: (episode) => write(client.from("agent_episodes").insert(episodeToRow(episode))),
    upsertEntity: (entity) =>
      write(client.from("agent_entities").upsert(entity, { onConflict: "id" })),
    openEdge: (edge) => openEdge(client, edge),
    closeEdge: (id, at) => closeEdge(client, id, at),
    edgesAt: async (entityId, at) => {
      const touching = await edgesTouching(client, entityId);
      return touching.ok ? ok(edgesValidAt(touching.value, at)) : touching;
    },
    episodesFor: (entityId) => episodesFor(client, entityId),
  };
}
