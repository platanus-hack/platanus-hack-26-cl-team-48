import { expect, it } from "vitest";
import { toExecutorPort, type ExecutorLog } from "@nodomics/protocol";
import { lazyExecutorPort } from "./lazy-executor-port.ts";

it("announces capabilities without loading and shares concurrent initialization", async () => {
  let loads = 0;
  const capabilities = { executor: "python", runtimes: ["python"] as const };
  const logs: ExecutorLog[] = [];
  const port = lazyExecutorPort(
    async () => {
      await Promise.resolve();
      loads++;
      return toExecutorPort({
        handlers: {
          "exec.hello": () => Promise.resolve({ executor: "python", runtimes: ["python"] }),
          "exec.drop": () => Promise.resolve({}),
          "exec.page": () => Promise.resolve({ columns: [], rows: [], total: 0 }),
          "exec.profile": () => Promise.resolve({ columns: [] }),
          "exec.export": () => Promise.resolve({ arrow: new Uint8Array() }),
          "exec.import": () => Promise.resolve({ id: "ref", rowCount: 0, schema: [] }),
          "exec.load": () =>
            Promise.resolve({ ok: true, ref: { id: "ref", rowCount: 0, schema: [] } }),
          "exec.run": () => Promise.resolve({ ok: true, outputs: {} }),
          "exec.display": () => Promise.resolve({ mime: "image/png", bytes: new Uint8Array() }),
          "exec.complete": () => Promise.resolve({ items: [] }),
        },
        onLog: (handler) => {
          handler({ taskId: "task", level: "info", message: "loaded" });
          return () => undefined;
        },
      });
    },
    { ...capabilities, runtimes: [...capabilities.runtimes] },
  );
  const stop = port.onLog((log) => logs.push(log));

  await expect(port.request("exec.hello", {})).resolves.toEqual(capabilities);
  expect(loads).toBe(0);
  expect(
    await Promise.all([
      port.request("exec.drop", { resultIds: [] }),
      port.request("exec.drop", { resultIds: [] }),
    ]),
  ).toEqual([{}, {}]);

  expect(loads).toBe(1);
  expect(logs).toHaveLength(1);
  stop();
});

it("retries failed creation and shares concurrent retry requests", async () => {
  let loads = 0;
  const port = lazyExecutorPort(
    async () => {
      await Promise.resolve();
      loads++;
      if (loads === 1) throw new Error("Unavailable runtime");
      return toExecutorPort({
        handlers: {
          "exec.hello": () => Promise.resolve({ executor: "python", runtimes: ["python"] }),
          "exec.drop": () => Promise.resolve({}),
          "exec.page": () => Promise.resolve({ columns: [], rows: [], total: 0 }),
          "exec.profile": () => Promise.resolve({ columns: [] }),
          "exec.export": () => Promise.resolve({ arrow: new Uint8Array() }),
          "exec.import": () => Promise.resolve({ id: "ref", rowCount: 0, schema: [] }),
          "exec.load": () =>
            Promise.resolve({ ok: true, ref: { id: "ref", rowCount: 0, schema: [] } }),
          "exec.run": () => Promise.resolve({ ok: true, outputs: {} }),
          "exec.display": () => Promise.resolve({ mime: "image/png", bytes: new Uint8Array() }),
          "exec.complete": () => Promise.resolve({ items: [] }),
        },
        onLog: () => () => undefined,
      });
    },
    { executor: "python", runtimes: ["python"] },
  );

  await expect(port.request("exec.drop", { resultIds: [] })).rejects.toThrow("Unavailable runtime");
  await expect(
    Promise.all([
      port.request("exec.drop", { resultIds: [] }),
      port.request("exec.drop", { resultIds: [] }),
    ]),
  ).resolves.toEqual([{}, {}]);
  expect(loads).toBe(2);
});
