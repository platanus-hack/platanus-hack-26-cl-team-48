import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { createSupabaseMemory } from "../src/memory/supabase-memory.ts";

type Call = {
  readonly table: string;
  readonly op: string;
  readonly payload: unknown;
  readonly filters: readonly (readonly [string, readonly unknown[]])[];
};
type Reply = { readonly data?: unknown; readonly error?: { readonly message: string } | null };

function fakeClient(respond: (call: Call) => Reply): { client: SupabaseClient; calls: Call[] } {
  const calls: Call[] = [];
  const start = (table: string) => {
    const state = {
      table,
      op: "",
      payload: undefined as unknown,
      filters: [] as Call["filters"][number][],
    };
    const builder: Record<string, unknown> = {
      then: (resolve: (reply: Reply) => unknown) => {
        const call = { ...state, filters: [...state.filters] };
        calls.push(call);
        return Promise.resolve(respond(call)).then(resolve);
      },
    };
    for (const op of ["insert", "upsert", "update", "select"]) {
      builder[op] = (payload?: unknown) => {
        if (state.op === "") state.op = op;
        if (op !== "select") state.payload = payload;
        return builder;
      };
    }
    for (const filter of ["eq", "contains", "order", "single"]) {
      builder[filter] = (...args: unknown[]) => {
        state.filters.push([filter, args]);
        return builder;
      };
    }
    return builder;
  };
  // The fake only implements the query builder methods the adapter uses.
  return { client: { from: start } as unknown as SupabaseClient, calls };
}

const EDGE_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  actor_id: "user-1",
  src: "a",
  dst: "b",
  relation: "uses",
  valid_from: "2026-11-21T10:00:00.000Z",
  valid_to: null,
};
const OK: Reply = { data: null, error: null };

describe("supabase memory", () => {
  it("maps an episode to a row of agent_episodes", async () => {
    const { client, calls } = fakeClient(() => OK);
    const result = await createSupabaseMemory(client).recordEpisode({
      id: "ep-1",
      at: "2026-11-21T10:00:00.000Z",
      actorId: "user-1",
      kind: "message",
      entityIds: ["flow-1"],
      payload: { text: "hi" },
    });
    expect(result).toEqual({ ok: true, value: undefined });
    expect(calls[0]).toMatchObject({
      table: "agent_episodes",
      op: "insert",
      payload: {
        id: "ep-1",
        at: "2026-11-21T10:00:00.000Z",
        actor_id: "user-1",
        kind: "message",
        entity_ids: ["flow-1"],
        payload: { text: "hi" },
      },
    });
  });

  it("maps a store error to a STORE_FAILED result", async () => {
    const { client } = fakeClient(() => ({ data: null, error: { message: "rls denied" } }));
    const result = await createSupabaseMemory(client).upsertEntity({
      id: "n",
      kind: "node",
      name: "N",
    });
    expect(result).toEqual({ ok: false, error: { code: "STORE_FAILED", message: "rls denied" } });
  });

  it("opens an edge and maps the returned row", async () => {
    const { client, calls } = fakeClient(() => ({ data: EDGE_ROW, error: null }));
    const result = await createSupabaseMemory(client).openEdge({
      src: "a",
      dst: "b",
      relation: "uses",
      at: EDGE_ROW.valid_from,
      actorId: "user-1",
    });
    expect(calls[0]).toMatchObject({
      table: "agent_edges",
      op: "insert",
      payload: {
        src: "a",
        dst: "b",
        relation: "uses",
        valid_from: EDGE_ROW.valid_from,
        actor_id: "user-1",
      },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        id: EDGE_ROW.id,
        actorId: "user-1",
        src: "a",
        dst: "b",
        relation: "uses",
        validFrom: EDGE_ROW.valid_from,
        validTo: null,
      },
    });
  });

  it("reports MALFORMED_ROW when a row does not match the schema", async () => {
    const { client } = fakeClient(() => ({ data: { id: 5 }, error: null }));
    const result = await createSupabaseMemory(client).openEdge({
      src: "a",
      dst: "b",
      relation: "r",
      at: "t",
      actorId: "user-1",
    });
    expect(result).toMatchObject({ ok: false, error: { code: "MALFORMED_ROW" } });
  });

  it("closes an edge by id and reports NOT_FOUND when nothing matched", async () => {
    const hit = fakeClient(() => ({ data: [{ id: "x" }], error: null }));
    const miss = fakeClient(() => ({ data: [], error: null }));
    const closed = await createSupabaseMemory(hit.client).closeEdge(
      "x",
      "2026-11-21T11:00:00.000Z",
    );
    const missing = await createSupabaseMemory(miss.client).closeEdge(
      "x",
      "2026-11-21T11:00:00.000Z",
    );
    expect(closed).toEqual({ ok: true, value: undefined });
    expect(hit.calls[0]).toMatchObject({
      op: "update",
      payload: { valid_to: "2026-11-21T11:00:00.000Z" },
    });
    expect(hit.calls[0]?.filters).toContainEqual(["eq", ["id", "x"]]);
    expect(missing).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("returns only the edges valid at the requested time, from both ends", async () => {
    const closed = {
      ...EDGE_ROW,
      id: "22222222-2222-2222-2222-222222222222",
      valid_to: "2026-11-21T10:30:00.000Z",
    };
    const { client, calls } = fakeClient((call) => ({
      data: call.filters.some(([, args]) => args[0] === "src") ? [EDGE_ROW, closed] : [],
      error: null,
    }));
    const result = await createSupabaseMemory(client).edgesAt(
      "a",
      "2026-11-21T11:00:00.000Z",
      "user-1",
    );
    expect(calls).toHaveLength(2);
    expect(result.ok && result.value.map((e) => e.id)).toEqual([EDGE_ROW.id]);
  });

  it("edgesAt never returns another actor's edges", async () => {
    const foreign = { ...EDGE_ROW, id: "33333333-3333-3333-3333-333333333333", actor_id: "user-2" };
    const { client, calls } = fakeClient(() => ({ data: [EDGE_ROW, foreign], error: null }));
    const result = await createSupabaseMemory(client).edgesAt(
      "a",
      "2026-11-21T11:00:00.000Z",
      "user-1",
    );
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call.filters).toContainEqual(["eq", ["actor_id", "user-1"]]);
    expect(result.ok && result.value.map((e) => e.id)).toEqual([EDGE_ROW.id]);
  });

  it("lists episodes that mention an entity and maps the rows", async () => {
    const row = {
      id: "ep-1",
      at: "2026-11-21T10:00:00.000Z",
      actor_id: "u",
      kind: "message",
      entity_ids: ["f"],
      payload: {},
    };
    const { client, calls } = fakeClient(() => ({ data: [row], error: null }));
    const result = await createSupabaseMemory(client).episodesFor("f");
    expect(calls[0]?.filters).toContainEqual(["contains", ["entity_ids", ["f"]]]);
    expect(result).toEqual({
      ok: true,
      value: [
        { id: "ep-1", at: row.at, actorId: "u", kind: "message", entityIds: ["f"], payload: {} },
      ],
    });
  });
});
