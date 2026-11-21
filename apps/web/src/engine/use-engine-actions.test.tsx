import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { AppStoresContext } from "../app-context.ts";
import { nodeOf } from "../canvas/canvas-fixtures.ts";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { EngineConnectionContext } from "./engine-connection.ts";
import { createEngineSession } from "./engine-session.ts";
import { useRunFlow } from "./use-engine-actions.ts";

it("runs the revision returned by flush even if the store changes before continuation", async () => {
  const stores = createAppStores();
  const engine = startFakeEngine({ "flow.run": () => ({ runId: "r1" }) });
  const session = createEngineSession({
    engineId: "fake",
    transport: engine.transport,
    dispatch: stores.engineStore.getState().dispatch,
  });
  const connection = {
    session,
    flushFlow: () => {
      stores.flowStore.getState().dispatch({ type: "node.add", node: nodeOf("a", "core.filter") });
      return Promise.resolve(0);
    },
  };
  const { result } = renderHook(useRunFlow, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoresContext value={stores}>
        <EngineConnectionContext value={connection}>{children}</EngineConnectionContext>
      </AppStoresContext>
    ),
  });

  await act(async () => {
    await result.current?.();
  });

  expect(engine.calls.filter((call) => call.method === "flow.run")).toEqual([
    { method: "flow.run", params: { rev: 0 } },
  ]);
  session.close();
});
it("sends selected targets with the flushed revision", async () => {
  const stores = createAppStores();
  const engine = startFakeEngine({ "flow.run": () => ({ runId: "r1" }) });
  const session = createEngineSession({
    engineId: "fake",
    transport: engine.transport,
    dispatch: stores.engineStore.getState().dispatch,
  });
  const connection = {
    session,
    flushFlow: () => {
      stores.flowStore.getState().dispatch({ type: "node.add", node: nodeOf("a", "core.filter") });
      return Promise.resolve(0);
    },
  };
  const { result } = renderHook(useRunFlow, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoresContext value={stores}>
        <EngineConnectionContext value={connection}>{children}</EngineConnectionContext>
      </AppStoresContext>
    ),
  });

  await act(async () => {
    await result.current?.(["a"]);
  });

  expect(engine.calls.filter((call) => call.method === "flow.run")).toEqual([
    { method: "flow.run", params: { rev: 0, targets: ["a"] } },
  ]);
  session.close();
});
