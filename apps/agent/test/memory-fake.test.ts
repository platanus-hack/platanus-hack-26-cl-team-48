import { describe, expect, it } from "vitest";
import { createFakeMemory } from "../src/memory/fake-memory.ts";
import type { Episode } from "../src/memory/memory-port.ts";

const ACTOR = "user-1";
const T1 = "2026-11-21T10:00:00.000Z";
const T2 = "2026-11-21T11:40:00.000Z";
const T3 = "2026-11-21T12:00:00.000Z";

const episode = (id: string, entityIds: readonly string[]): Episode => ({
  id,
  at: T1,
  actorId: "user-1",
  kind: "message",
  entityIds,
  payload: { text: "hi" },
});

describe("fake memory contract", () => {
  it("records episodes and lists them by entity", async () => {
    const memory = createFakeMemory();
    await memory.recordEpisode(episode("ep-1", ["flow-1"]));
    await memory.recordEpisode(episode("ep-2", ["flow-2"]));
    const found = await memory.episodesFor("flow-1");
    expect(found).toEqual({ ok: true, value: [episode("ep-1", ["flow-1"])] });
  });

  it("rejects a duplicate episode id because episodes are insert-only", async () => {
    const memory = createFakeMemory();
    await memory.recordEpisode(episode("ep-1", ["flow-1"]));
    const again = await memory.recordEpisode(episode("ep-1", ["flow-1"]));
    expect(again).toMatchObject({ ok: false, error: { code: "STORE_FAILED" } });
  });

  it("opens an edge and finds it from either end", async () => {
    const memory = createFakeMemory();
    const opened = await memory.openEdge({
      src: "a",
      dst: "b",
      relation: "created",
      at: T1,
      actorId: ACTOR,
    });
    expect(opened).toMatchObject({ ok: true, value: { src: "a", dst: "b", validTo: null } });
    for (const id of ["a", "b"]) {
      const edges = await memory.edgesAt(id, T2, ACTOR);
      expect(edges.ok && edges.value.map((e) => e.relation)).toEqual(["created"]);
    }
  });

  it("closes an edge so it is no longer valid afterwards but still was before", async () => {
    const memory = createFakeMemory();
    const opened = await memory.openEdge({
      src: "a",
      dst: "b",
      relation: "uses",
      at: T1,
      actorId: ACTOR,
    });
    if (!opened.ok) throw new Error("setup failed");
    expect(await memory.closeEdge(opened.value.id, T2)).toEqual({ ok: true, value: undefined });
    const before = await memory.edgesAt("a", T1, ACTOR);
    const after = await memory.edgesAt("a", T3, ACTOR);
    expect(before.ok && before.value).toHaveLength(1);
    expect(after.ok && after.value).toHaveLength(0);
  });

  it("fails with NOT_FOUND when closing an unknown edge", async () => {
    const result = await createFakeMemory().closeEdge("nope", T1);
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("edgesAt never returns another actor's edges", async () => {
    const memory = createFakeMemory();
    await memory.openEdge({ src: "a", dst: "mine", relation: "uses", at: T1, actorId: ACTOR });
    await memory.openEdge({ src: "a", dst: "theirs", relation: "uses", at: T1, actorId: "user-2" });
    const mine = await memory.edgesAt("a", T2, ACTOR);
    const theirs = await memory.edgesAt("a", T2, "user-2");
    const nobody = await memory.edgesAt("a", T2, "user-3");
    expect(mine.ok && mine.value.map((e) => [e.dst, e.actorId])).toEqual([["mine", ACTOR]]);
    expect(theirs.ok && theirs.value.map((e) => e.dst)).toEqual(["theirs"]);
    expect(nobody.ok && nobody.value).toEqual([]);
  });

  it("upserts entities without error", async () => {
    const memory = createFakeMemory();
    const entity = { id: "flow-1", kind: "flow", name: "Harvest" };
    expect(await memory.upsertEntity(entity)).toEqual({ ok: true, value: undefined });
    expect(await memory.upsertEntity({ ...entity, name: "Harvest v2" })).toEqual({
      ok: true,
      value: undefined,
    });
  });
});
