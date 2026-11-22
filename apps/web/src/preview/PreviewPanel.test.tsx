import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { BAR, CATALOG, FILTER, flowOf, manifestOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { PreviewPanel } from "./PreviewPanel.tsx";

function renderPanel() {
  const stores = createAppStores(flowOf([nodeOf("bar", BAR.id)]));
  stores.selectionStore.getState().select(["bar"]);
  stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [BAR] });
  const rendered = renderWithEngine(<PreviewPanel />, {
    stores,
    handlers: {
      "data.view": () => ({ spec: null, sampled: true, rowCount: 0 }),
    },
  });
  const dispatch = stores.engineStore.getState().dispatch;
  dispatch({ type: "run.requested", rev: 0 });
  const viewCalls = () => rendered.engine.calls.filter((call) => call.method === "data.view");
  return { dispatch, viewCalls };
}

describe("PreviewPanel", () => {
  it.each(["done", "cached", "finished"] as const)(
    "queries a view only after its current result is %s",
    async (completion) => {
      const { dispatch, viewCalls } = renderPanel();
      await act(async () => {
        await Promise.resolve();
        dispatch({ type: "run.requested", rev: 0 });
        dispatch({ type: "run.started", rev: 0, runId: "r1" });
      });
      expect(viewCalls()).toHaveLength(0);

      await act(async () => {
        await Promise.resolve();
        if (completion === "finished")
          dispatch({
            type: "run.finished",
            payload: {
              rev: 0,
              runId: "r1",
              status: "done",
              durationMs: 1,
              executed: ["bar"],
              cached: [],
            },
          });
        else
          dispatch({
            type: "node.status",
            payload: { rev: 0, runId: "r1", nodeId: "bar", state: completion },
          });
      });
      await waitFor(() => {
        expect(viewCalls()).toHaveLength(1);
      });

      await act(async () => {
        await Promise.resolve();
        dispatch({ type: "run.requested", rev: 0 });
        dispatch({ type: "run.started", rev: 0, runId: "r2" });
      });
      expect(viewCalls()).toHaveLength(1);
      await act(async () => {
        await Promise.resolve();
        dispatch({
          type: "node.status",
          payload: { rev: 0, runId: "r2", nodeId: "bar", state: "done" },
        });
      });
      await waitFor(() => {
        expect(viewCalls()).toHaveLength(2);
      });
    },
  );

  it("associates tabs with panels and moves selection and focus with arrow keys", async () => {
    const { dispatch } = renderPanel();
    await act(async () => {
      await Promise.resolve();
      dispatch({
        type: "node.result",
        payload: {
          rev: 0,
          runId: "r1",
          nodeId: "bar",
          port: "out",
          ref: { id: "ref", rowCount: 0, schema: [] },
        },
      });
    });
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    const first = screen.getByRole("tab", { selected: true });
    expect(
      document.getElementById(first.getAttribute("aria-controls") ?? "")?.getAttribute("role"),
    ).toBe("tabpanel");
    first.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[2]?.getAttribute("aria-selected")).toBe("true");
  });
});

it("does not query a node absent from a finished run or reuse completion after an edit", async () => {
  const { dispatch, viewCalls } = renderPanel();
  await act(async () => {
    await Promise.resolve();
    dispatch({
      type: "run.finished",
      payload: {
        rev: 0,
        runId: "r1",
        status: "done",
        durationMs: 1,
        executed: ["other"],
        cached: [],
      },
    });
  });
  expect(viewCalls()).toHaveLength(0);
  await act(async () => {
    await Promise.resolve();
    dispatch({
      type: "node.status",
      payload: { rev: 0, runId: "r1", nodeId: "bar", state: "done" },
    });
  });
  await waitFor(() => {
    expect(viewCalls()).toHaveLength(1);
  });
  await act(async () => {
    await Promise.resolve();
    dispatch({ type: "flow.submitted", rev: 1 });
  });
  expect(viewCalls()).toHaveLength(1);
});

it("groups the preview title and tabs in one header", () => {
  renderPanel();

  const heading = screen.getByRole("heading", { name: "Vista previa" });
  expect(heading.closest("header")?.querySelector('[role="tablist"]')).toBeTruthy();
});

it("names the previewed node and the size of its result in the header", async () => {
  const { dispatch } = renderPanel();
  await act(async () => {
    await Promise.resolve();
    dispatch({
      type: "node.result",
      payload: {
        rev: 0,
        runId: "r1",
        nodeId: "bar",
        port: "out",
        ref: { id: "ref", rowCount: 1200, schema: [{ name: "a", type: "text" }] },
      },
    });
  });

  const header = screen.getByRole("heading", { name: "Vista previa" }).closest("header");
  expect(header?.textContent).toContain(BAR.name);
  expect(header?.textContent).toContain("1.200 filas · 1 col.");
});

describe("PreviewPanel of a resource node", () => {
  const REPO = manifestOf("core.deploy.repo", {
    name: "Repo",
    category: "Hosteo",
    inputs: [],
    outputs: [{ id: "repo", type: "repo" }],
    impl: { kind: "resource", resource: "repo" },
  });
  const RUN_HINT = "Ejecuta el flujo para ver los datos de este nodo.";

  async function renderSelected(type: string) {
    const stores = createAppStores(flowOf([nodeOf("n", type)]));
    stores.selectionStore.getState().select(["n"]);
    stores.engineStore.getState().dispatch({ type: "catalog.loaded", nodes: [...CATALOG, REPO] });
    renderWithEngine(<PreviewPanel />, { stores });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("does not ask to run the flow to see a resource node's data", async () => {
    await renderSelected(REPO.id);

    expect(screen.queryByText(RUN_HINT)).toBeNull();
  });

  it("still asks to run the flow to see a data node's data", async () => {
    await renderSelected(FILTER.id);

    expect(screen.getByText(RUN_HINT)).toBeDefined();
  });
});
