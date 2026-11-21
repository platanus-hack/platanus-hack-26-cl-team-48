import { expect, it } from "vitest";
import { recordMcpCall } from "../src/memory/episodes.ts";
import { createFakeMemory } from "../src/memory/fake-memory.ts";

const AT = "2026-11-21T10:00:00.000Z";
const TOKEN = "secret-access-token-123";

const CALL = {
  actorId: "user-1",
  tool: "flows.set_param",
  args: { draftId: "draft-1", name: "hours", value: 2 },
  result: { ok: true },
  at: AT,
};

it("every mcp call records one episode", async () => {
  const memory = createFakeMemory();
  await recordMcpCall(memory, CALL);
  await recordMcpCall(memory, { ...CALL, tool: "flows.validate" });
  const found = await memory.episodesFor("draft-1");
  expect(found.ok && found.value).toHaveLength(2);
  expect(found.ok && found.value[0]).toMatchObject({
    kind: "mcp_call",
    actorId: "user-1",
    at: AT,
    entityIds: ["draft-1"],
  });
});

it("episode payload never contains access tokens", async () => {
  const memory = createFakeMemory();
  await recordMcpCall(memory, {
    ...CALL,
    args: {
      draftId: "draft-1",
      accessToken: TOKEN,
      headers: { Authorization: `Bearer ${TOKEN}` },
      nested: [{ note: `sent with Bearer ${TOKEN}`, api_key: TOKEN }],
    },
    result: { echoed: `Authorization: Bearer ${TOKEN}`, token: TOKEN },
  });
  const found = await memory.episodesFor("draft-1");
  expect(found.ok).toBe(true);
  expect(JSON.stringify(found.ok && found.value)).not.toContain(TOKEN);
});

it("keeps the non secret arguments in the payload", async () => {
  const memory = createFakeMemory();
  await recordMcpCall(memory, CALL);
  const found = await memory.episodesFor("draft-1");
  expect(found.ok && found.value[0]?.payload).toEqual({
    tool: "flows.set_param",
    args: { draftId: "draft-1", name: "hours", value: 2 },
    result: { ok: true },
  });
});

it("returns the memory error when the store fails", async () => {
  const failure = { ok: false, error: { code: "STORE_FAILED", message: "down" } } as const;
  const failing = { ...createFakeMemory(), recordEpisode: () => Promise.resolve(failure) };
  expect(await recordMcpCall(failing, CALL)).toEqual(failure);
});
