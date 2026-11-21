import { describe, expect, it } from "vitest";
import { applyEvent, createEngineState, type EngineState } from "../engine/engine-state.ts";
import { CATALOG, edgeOf, flowOf, nodeOf } from "./canvas-fixtures.ts";
import { toEdgeViews, toNodeViews } from "./node-views.ts";

const FLOW = flowOf(
  [
    nodeOf("src", "core.source.sample"),
    nodeOf("f", "core.filter"),
    nodeOf("bar", "core.view.bar"),
    nodeOf("py", "core.python.zscore"),
  ],
  [edgeOf("e1", ["src", "out"], ["f", "in"])],
);

const viewsOf = (engine: Partial<EngineState> = {}) =>
  toNodeViews({ flow: FLOW, catalog: CATALOG, engine: { ...createEngineState(), ...engine } });

const viewOf = (id: string, engine: Partial<EngineState> = {}) =>
  viewsOf(engine).find((view) => view.id === id);

describe("toNodeViews", () => {
  it("titles each node with its manifest name and picks the variant from the manifest", () => {
    expect(viewsOf().map(({ id, props }) => [id, props.title, props.variant])).toEqual([
      ["src", "Datos de ejemplo", "source"],
      ["f", "Filtrar", "transform"],
      ["bar", "Gráfico de barras", "view"],
      ["py", "Puntaje Z", "code"],
    ]);
  });

  it("marks which ports are connected", () => {
    expect(viewOf("f")?.props.inputs).toEqual([{ type: "table", connected: true }]);
  });

  it("lists the port ids the canvas attaches connections to", () => {
    expect(viewOf("f")?.handles).toEqual({ inputs: ["in"], outputs: ["out"] });
  });

  it("shows nodes without news from the engine as idle", () => {
    expect(viewOf("f")?.props.state).toBe("idle");
  });

  it("shows the state, progress and error reported by the engine", () => {
    const view = viewOf("f", {
      nodes: { f: { state: "error", error: { code: "SQL_ERROR", message: "Falló la consulta" } } },
    });

    expect(view?.props).toMatchObject({ state: "error", errorMessage: "Falló la consulta" });
  });

  it("shows configuration issues as an incomplete node with the engine's message", () => {
    const view = viewOf("f", {
      issues: [
        { nodeId: "f", code: "PARAM_REQUIRED", message: "Falta la columna", param: "column" },
      ],
    });

    expect(view?.props).toMatchObject({ conditions: ["incomplete"], summary: "Falta la columna" });
  });

  it("shows the size of the first result", () => {
    const view = viewOf("src", {
      results: {
        src: {
          out: { id: "r1", rowCount: 120, schema: [{ name: "a", type: "text" }] },
        },
      },
    });

    expect(view?.props).toMatchObject({ rows: 120, cols: 1 });
  });

  it("flags nodes whose type the engine does not know", () => {
    const [view] = toNodeViews({
      flow: flowOf([nodeOf("x", "otro.nodo")]),
      catalog: CATALOG,
      engine: createEngineState(),
    });

    expect(view?.props).toMatchObject({ title: "otro.nodo", conditions: ["missing"] });
  });

  it("shows where the node runs once the engine is connected", () => {
    const view = viewOf("f", {
      connection: {
        status: "connected",
        engineId: "mock",
        capabilities: { protocol: "0.1", engine: "mock", runtimes: [], sources: [] },
      },
    });

    expect(view?.props.engine).toBe("browser");
  });
});

describe("toEdgeViews", () => {
  it("connects port handles and carries the data type of the output", () => {
    expect(toEdgeViews({ flow: FLOW, catalog: CATALOG, engine: createEngineState() })).toEqual([
      {
        id: "e1",
        source: "src",
        sourceHandle: "out",
        target: "f",
        targetHandle: "in",
        type: "table",
      },
    ]);
  });
});

it.each([
  ["python-local", "local"],
  ["duckdb-wasm", "browser"],
  ["pyodide", "browser"],
])("shows executor %s for a node after the run finishes", (executor, expected) => {
  const engine = {
    ...createEngineState(),
    connection: {
      status: "connected" as const,
      engineId: "browser",
      capabilities: { protocol: "0.1", engine: "browser" as const, runtimes: [], sources: [] },
    },
  };
  const running = applyEvent(engine, { type: "run.requested", rev: 0 });
  const executed = applyEvent(running, {
    type: "node.status",
    payload: { rev: 0, runId: "r1", nodeId: "py", state: "done", executor },
  });
  const finished = applyEvent(executed, {
    type: "run.finished",
    payload: { rev: 0, runId: "r1", status: "done", durationMs: 1, executed: ["py"], cached: [] },
  });

  expect(viewOf("py", executed)?.props.engine).toBe(expected);
  expect(viewOf("py", finished)?.props.engine).toBe(expected);
  expect(viewOf("f", finished)?.props.engine).toBe("browser");
});

describe("node and edge views of the floating design", () => {
  const withIcons = CATALOG.map((manifest) =>
    manifest.id === "core.filter"
      ? { ...manifest, icon: "filter" }
      : manifest.id === "core.python.zscore"
        ? { ...manifest, icon: "not-a-design-icon" }
        : manifest,
  );

  it("draws the manifest's icon when the design system has it, the variant's otherwise", () => {
    const views = toNodeViews({ flow: FLOW, catalog: withIcons, engine: createEngineState() });

    expect(views.find((view) => view.id === "f")?.props.icon).toBe("filter");
    expect(views.find((view) => view.id === "py")?.props.icon).toBe("code");
    expect(views.find((view) => view.id === "src")?.props.icon).toBe("database");
  });

  it("labels a connection with the size of the table it carries", () => {
    const result = {
      id: "r1",
      rowCount: 200,
      schema: [
        { name: "a", type: "text" as const },
        { name: "b", type: "number" as const },
      ],
    };
    const engine = { ...createEngineState(), results: { src: { out: result } } };

    expect(toEdgeViews({ flow: FLOW, catalog: CATALOG, engine })).toMatchObject([
      { id: "e1", rows: 200, columns: 2 },
    ]);
  });
});
