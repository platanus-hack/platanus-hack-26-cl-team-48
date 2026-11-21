import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { edgeOf, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { createDeferred } from "../testing/deferred.ts";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { EngineConnectionContext } from "./engine-connection.ts";
import { createEngineSession } from "./engine-session.ts";
import { ParamsForm } from "../form/ParamsForm.tsx";

const FLOW = flowOf(
  [nodeOf("source", "core.source.sample"), nodeOf("target", "core.view.bar")],
  [edgeOf("input", ["source", "out"], ["target", "in"])],
);

const MANIFEST = manifestOf("core.view.bar", {
  params: {
    type: "object",
    properties: {
      x: { title: "Eje X", type: "string", "x-nodomics": { widget: "column", of: "in" } },
    },
  },
});

function ColumnSelector() {
  return (
    <ParamsForm
      node={nodeOf("target", "core.view.bar")}
      manifest={MANIFEST}
      issues={[]}
      onChange={() => undefined}
    />
  );
}

it.each(["connect", "import"])(
  "waits for flow acceptance before inferring after %s",
  async (edit) => {
    const accepted = createDeferred();
    const stores = createAppStores(flowOf(FLOW.nodes));
    const engineState = { hasAccepted: false };
    const engine = startFakeEngine({
      "flow.set": async ({ rev }) => {
        await accepted.promise;
        engineState.hasAccepted = true;
        return { rev, stale: [], errors: [] };
      },
      "schema.infer": () => ({
        ok: true,
        columns: engineState.hasAccepted ? [{ name: "region", type: "text" }] : [],
      }),
    });
    const session = createEngineSession({
      engineId: "fake",
      transport: engine.transport,
      dispatch: stores.engineStore.getState().dispatch,
    });
    stores.flowStore
      .getState()
      .dispatch(
        edit === "connect"
          ? { type: "edge.add", edge: edgeOf("input", ["source", "out"], ["target", "in"]) }
          : { type: "flow.load", flow: FLOW },
      );
    const submitted = session.submitFlow(1, stores.flowStore.getState().state.flow);
    const rendered = renderWithStores(
      <EngineConnectionContext value={{ session, flushFlow: () => Promise.resolve(1) }}>
        <ColumnSelector />
      </EngineConnectionContext>,
      stores,
    );

    await waitFor(() => {
      expect(engine.calls.some(({ method }) => method === "flow.set")).toBe(true);
    });
    await userEvent.click(screen.getByRole("button", { name: /Eje X/ }));
    expect(engine.calls.filter(({ method }) => method === "schema.infer")).toHaveLength(0);
    await act(async () => {
      accepted.resolve();
      await submitted;
    });

    expect(await screen.findByRole("option", { name: /region/ })).toBeDefined();
    rendered.unmount();
    session.close();
  },
);

it.each([{ columns: [] }, { columns: [{ name: "old", type: "text" as const }] }])(
  "ignores late inference %j from an older revision without blocking the accepted revision",
  async ({ columns }) => {
    const oldInference = createDeferred();
    const stores = createAppStores(FLOW);
    const inference = { count: 0 };
    const engine = startFakeEngine({
      "flow.set": ({ rev }) => ({ rev, stale: [], errors: [] }),
      "schema.infer": async () => {
        inference.count += 1;
        if (inference.count === 1) {
          await oldInference.promise;
          return { ok: true, columns };
        }
        return { ok: true, columns: [{ name: "current", type: "text" }] };
      },
    });
    const session = createEngineSession({
      engineId: "fake",
      transport: engine.transport,
      dispatch: stores.engineStore.getState().dispatch,
    });
    await session.submitFlow(1, FLOW);
    const rendered = renderWithStores(
      <EngineConnectionContext value={{ session, flushFlow: () => Promise.resolve(2) }}>
        <ColumnSelector />
      </EngineConnectionContext>,
      stores,
    );
    await waitFor(() => {
      expect(inference.count).toBe(1);
    });
    await userEvent.click(screen.getByRole("button", { name: /Eje X/ }));

    await act(async () => {
      await session.submitFlow(2, FLOW);
    });
    expect(await screen.findByRole("option", { name: /current/ })).toBeDefined();
    await act(async () => {
      oldInference.resolve();
      await oldInference.promise;
    });

    expect(screen.queryByRole("option", { name: /old/ })).toBeNull();
    expect(screen.getByRole("option", { name: /current/ })).toBeDefined();
    rendered.unmount();
    session.close();
  },
);
