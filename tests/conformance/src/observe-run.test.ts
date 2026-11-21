import { createEngineClient, createMemoryTransportPair } from "@nodomics/client";
import { createPeer } from "@nodomics/rpc";
import { expect, it, vi } from "vitest";
import { observeRun } from "./observe-run.ts";

it.each([undefined, 12000])("uses the configured run timeout %s", async (timeout) => {
  vi.useFakeTimers();
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const client = createEngineClient(clientEnd);
  const peer = createPeer(engineEnd);
  const observer = observeRun(client, timeout);

  try {
    const waiting = observer.wait({ runId: "run", rev: 1 });
    const rejected = expect(waiting).rejects.toThrow("Timed out waiting for run.finished: run");
    await vi.advanceTimersByTimeAsync((timeout ?? 30000) - 1);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    observer.dispose();
    client.close();
    peer.close();
    vi.useRealTimers();
  }
});

it("waits for matching run and revision after unrelated finished events", async () => {
  const [clientEnd, engineEnd] = createMemoryTransportPair();
  const client = createEngineClient(clientEnd);
  const peer = createPeer(engineEnd);
  const observer = observeRun(client);
  const finished = { status: "done" as const, durationMs: 0, executed: [], cached: [] };

  try {
    const completed: unknown[] = [];
    const waiting = (async () => {
      const results = await observer.wait({ runId: "run", rev: 1 });
      completed.push(results);
      return results;
    })();
    peer.handle("nodes.register", () => ({}));
    peer.notify("run.finished", { ...finished, runId: "other", rev: 1 });
    peer.notify("run.finished", { ...finished, runId: "run", rev: 0 });
    await client.request("nodes.register", { nodes: [] });
    expect(completed).toEqual([]);
    peer.notify("run.finished", { ...finished, runId: "run", rev: 1 });
    await expect(waiting).resolves.toEqual([]);
  } finally {
    observer.dispose();
    client.close();
    peer.close();
  }
});
