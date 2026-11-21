import { err, ok } from "@nodomics/protocol";
import { describe, expect, it } from "vitest";
import { createFakeMemory } from "../src/memory/fake-memory.ts";
import { withMemory } from "../src/memory/recording-mcp.ts";
import type { McpPort } from "../src/mcp/mcp-port.ts";

const TOKEN = "super-secret-token-xyz";
const IDENTITY = { userId: "user-1", accessToken: TOKEN };
const AT = "2026-11-21T10:00:00.000Z";
const clock = () => AT;

const stubMcp = (
  outcome: ReturnType<McpPort["call"]> extends Promise<infer R> ? R : never,
): McpPort => ({
  listTools: () => Promise.resolve(ok([])),
  call: () => Promise.resolve(outcome),
});

describe("withMemory", () => {
  it("records one episode per call", async () => {
    const memory = createFakeMemory();
    const mcp = withMemory(stubMcp(ok({ nodes: [1, 2, 3] })), memory, clock);
    await mcp.call("nodes.list", { flowId: "f-1" }, IDENTITY);
    await mcp.call("flows.validate", { flowId: "f-1" }, IDENTITY);
    const found = await memory.episodesFor("f-1");
    expect(found.ok && found.value).toHaveLength(2);
    expect(found.ok && found.value[0]).toMatchObject({
      kind: "mcp_call",
      actorId: "user-1",
      at: AT,
      payload: { tool: "nodes.list", args: { flowId: "f-1" } },
    });
  });

  it("returns the mcp result unchanged, errors included", async () => {
    const failure = err({ code: "TOOL_FAILED", message: "boom" } as const);
    const okResult = await withMemory(stubMcp(ok(42)), createFakeMemory(), clock).call(
      "t",
      {},
      IDENTITY,
    );
    const errResult = await withMemory(stubMcp(failure), createFakeMemory(), clock).call(
      "t",
      {},
      IDENTITY,
    );
    expect(okResult).toEqual(ok(42));
    expect(errResult).toEqual(failure);
  });

  it("memory failure never breaks the mcp call", async () => {
    const down = { ok: false, error: { code: "STORE_FAILED", message: "down" } } as const;
    const memory = { ...createFakeMemory(), recordEpisode: () => Promise.resolve(down) };
    const throwing = { ...memory, recordEpisode: () => Promise.reject(new Error("network")) };
    const first = withMemory(stubMcp(ok("fine")), memory, clock);
    const second = withMemory(stubMcp(ok("fine")), throwing, clock);
    expect(await first.call("t", {}, IDENTITY)).toEqual(ok("fine"));
    expect(await second.call("t", {}, IDENTITY)).toEqual(ok("fine"));
    expect(first.droppedEpisodes()).toBe(1);
    expect(second.droppedEpisodes()).toBe(1);
  });

  it("never stores access tokens", async () => {
    const memory = createFakeMemory();
    const mcp = withMemory(stubMcp(ok({ echoed: `Bearer ${TOKEN}` })), memory, clock);
    await mcp.call("t", { flowId: "f-1", accessToken: TOKEN }, IDENTITY);
    const found = await memory.episodesFor("f-1");
    expect(JSON.stringify(found.ok && found.value)).not.toContain(TOKEN);
  });

  it("summarizes the result instead of storing it whole", async () => {
    const memory = createFakeMemory();
    const mcp = withMemory(stubMcp(ok({ big: "x".repeat(5000) })), memory, clock);
    await mcp.call("t", { flowId: "f-1" }, IDENTITY);
    const found = await memory.episodesFor("f-1");
    expect(JSON.stringify(found.ok && found.value).length).toBeLessThan(600);
  });

  it("lists tools without recording anything", async () => {
    const memory = createFakeMemory();
    const mcp = withMemory(stubMcp(ok(1)), memory, clock);
    expect(await mcp.listTools()).toEqual(ok([]));
    expect(mcp.droppedEpisodes()).toBe(0);
  });
});
