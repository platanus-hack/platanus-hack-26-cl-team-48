import { createDeferred } from "../testing/deferred.ts";
import { FLOW_FORMAT, type Flow } from "@nodomics/protocol";
import { describe, expect, it, vi } from "vitest";
import { createFlowSync, type Timers } from "./flow-sync.ts";

const flowNamed = (name: string): Flow => ({ format: FLOW_FORMAT, name, nodes: [], edges: [] });

function createManualTimers() {
  const pending = new Map<number, () => void>();
  const counter = { next: 0 };
  const timers: Timers = {
    set: (callback) => {
      counter.next += 1;
      pending.set(counter.next, callback);
      return counter.next;
    },
    clear: (handle) => {
      pending.delete(handle);
    },
  };
  const fireAll = () => {
    [...pending.values()].forEach((callback) => {
      callback();
    });
    pending.clear();
  };
  return { timers, fireAll, pendingCount: () => pending.size };
}

function createSync() {
  const manual = createManualTimers();
  const submitted: { rev: number; name: string | undefined }[] = [];
  const sync = createFlowSync({
    delayMs: 300,
    onError: () => undefined,
    timers: manual.timers,
    submit: async (rev, flow) => {
      submitted.push({ rev, name: flow.name });
      await Promise.resolve();
    },
  });
  return { ...manual, submitted, sync };
}

describe("createFlowSync", () => {
  it("waits for the delay before submitting", () => {
    const { submitted, sync } = createSync();

    sync.schedule(1, flowNamed("a"));

    expect(submitted).toEqual([]);
  });

  it("submits only the last flow of a burst of changes", () => {
    const { fireAll, submitted, sync } = createSync();

    sync.schedule(1, flowNamed("a"));
    sync.schedule(2, flowNamed("b"));
    fireAll();

    expect(submitted).toEqual([{ rev: 2, name: "b" }]);
  });

  it("submits the pending flow at once when flushed", async () => {
    const { pendingCount, submitted, sync } = createSync();
    sync.schedule(3, flowNamed("c"));

    await sync.flush();

    expect(submitted).toEqual([{ rev: 3, name: "c" }]);
    expect(pendingCount()).toBe(0);
  });

  it("does nothing on flush when nothing is pending", async () => {
    const { submitted, sync } = createSync();

    await sync.flush();

    expect(submitted).toEqual([]);
  });

  it("drops the pending flow when cancelled", () => {
    const { fireAll, submitted, sync } = createSync();
    sync.schedule(1, flowNamed("a"));

    sync.cancel();
    fireAll();

    expect(submitted).toEqual([]);
  });
});

it("waits for an active send and serializes coalesced revisions", async () => {
  const manual = createManualTimers();
  const first = createDeferred();
  const second = createDeferred();
  const sent: number[] = [];
  const sync = createFlowSync({
    delayMs: 300,
    onError: () => undefined,
    timers: manual.timers,
    submit: async (rev) => {
      sent.push(rev);
      await (rev === 1 ? first.promise : second.promise);
    },
  });
  sync.schedule(1, flowNamed("a"));
  manual.fireAll();
  sync.schedule(2, flowNamed("b"));
  sync.schedule(3, flowNamed("c"));
  manual.fireAll();
  const finished: string[] = [];
  const finish = async () => {
    await sync.flush();
    finished.push("done");
  };
  const flushing = finish();
  await Promise.resolve();
  expect(sent).toEqual([1]);
  expect(finished).toEqual([]);
  first.resolve();
  await vi.waitFor(() => {
    expect(sent).toEqual([1, 3]);
  });
  expect(finished).toEqual([]);
  second.resolve();
  await flushing;
  expect(finished).toEqual(["done"]);
});

it("reports timer submission failures and allows retrying", async () => {
  const manual = createManualTimers();
  const errors: unknown[] = [];
  const failure = new Error("submit failed");
  const sync = createFlowSync({
    delayMs: 300,
    timers: manual.timers,
    onError: (error: unknown) => {
      errors.push(error);
    },
    submit: () => Promise.reject(failure),
  });
  sync.schedule(1, flowNamed("a"));

  manual.fireAll();
  await vi.waitFor(() => {
    expect(errors).toEqual([failure]);
  });

  sync.schedule(2, flowNamed("b"));
  await expect(sync.flush()).rejects.toBe(failure);
});

it("returns the last confirmed revision even with no pending changes", async () => {
  const { sync } = createSync();
  sync.schedule(3, flowNamed("a"));

  expect(await sync.flush()).toBe(3);
  expect(await sync.flush()).toBe(3);
});
