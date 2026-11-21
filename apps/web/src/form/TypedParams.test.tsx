import type { Column, FlowNode, NodeManifest } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { edgeOf, flowOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { ParamsForm } from "./ParamsForm.tsx";

const LINE: NodeManifest = {
  id: "core.view.line",
  version: "0.1.0",
  name: "Líneas",
  category: "Vistas",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: {
        title: "Eje X",
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["date", "number"] },
      },
      series: { title: "Series", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      timeUnit: {
        title: "Agrupar fechas por",
        oneOf: [
          { const: null, title: "Sin agrupar" },
          { const: "yearmonth", title: "Mes" },
        ],
        default: "yearmonth",
        "x-nodomics": { when: { param: "x", types: ["date"] } },
      },
    },
    required: ["x"],
  },
  impl: { kind: "view", spec: {} },
};

const CODE: NodeManifest = {
  ...LINE,
  id: "core.python.custom",
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      columns: {
        title: "Columnas de salida",
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { title: "Nombre", type: "string" },
            type: { title: "Tipo", enum: ["number", "text", "date"] },
          },
          required: ["name", "type"],
        },
        "x-nodomics": { widget: "port-schema", port: "out" },
      },
    },
  },
  impl: { kind: "python", code: "", entry: "run" },
};

const COLUMNS: ReadonlyArray<Column> = [
  { name: "fecha", type: "date" },
  { name: "total", type: "number" },
  { name: "region", type: "text" },
];

function renderTyped(
  params: FlowNode["params"],
  manifest: NodeManifest = LINE,
): {
  changes: Array<{ param: string; value: unknown }>;
  stores: ReturnType<typeof createAppStores>;
} {
  const node: FlowNode = { ...nodeOf("n", manifest.id), params };
  const stores = createAppStores(
    flowOf([nodeOf("s", "core.source.sample"), node], [edgeOf("e", ["s", "out"], ["n", "in"])]),
  );
  stores.engineStore.getState().dispatch({ type: "flow.accepted", rev: 0, stale: [], errors: [] });
  stores.engineStore.getState().dispatch({
    type: "schema.inferred",
    rev: 0,
    nodeId: "s",
    port: "out",
    columns: [...COLUMNS],
  });
  const changes: Array<{ param: string; value: unknown }> = [];
  renderWithStores(
    <ParamsForm
      node={node}
      manifest={manifest}
      issues={[]}
      onChange={(param, value) => changes.push({ param, value })}
    />,
    stores,
  );
  return { changes, stores };
}

describe("params that depend on column types", () => {
  it("shows a param only while the chosen column has a type it applies to", () => {
    renderTyped({ x: "fecha" });
    expect(screen.getByRole("combobox", { name: /Agrupar fechas por/ })).toBeDefined();
  });

  it("hides a param whose condition does not hold for the chosen column", () => {
    renderTyped({ x: "total" });
    expect(screen.queryByRole("combobox", { name: /Agrupar fechas por/ })).toBeNull();
  });

  it("disables the columns of a type the param does not accept", async () => {
    renderTyped({});

    await userEvent.click(screen.getByRole("button", { name: "Eje X" }));

    expect(screen.getByRole("option", { name: /region/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("option", { name: /fecha/ }).hasAttribute("disabled")).toBe(false);
  });

  it("says on the field when the chosen column has a type it does not accept", () => {
    renderTyped({ x: "region" });

    expect(screen.getByRole("alert").textContent).toContain(
      'La columna "region" es texto; aquí se espera fecha o número',
    );
  });

  it("says on the field when the chosen column is not in the input", () => {
    renderTyped({ x: "borrada" });

    expect(screen.getByRole("alert").textContent).toContain('No existe la columna "borrada"');
  });

  it("shows the default of an unset select and clears it to null", async () => {
    const { changes } = renderTyped({ x: "fecha" });
    const select = screen.getByRole("combobox", { name: /Agrupar fechas por/ });

    expect((select as HTMLSelectElement).value).toBe("yearmonth");
    await userEvent.selectOptions(select, "Sin agrupar");
    expect(changes).toEqual([{ param: "timeUnit", value: null }]);
  });

  it("clears an optional column", async () => {
    const { changes } = renderTyped({ x: "fecha", series: "region" });

    await userEvent.click(screen.getByRole("button", { name: "Quitar Series" }));

    expect(changes).toEqual([{ param: "series", value: null }]);
  });
});

describe("declared output columns", () => {
  it("copies the columns of the node's last result", async () => {
    const { changes, stores } = renderTyped({}, CODE);
    const { dispatch } = stores.engineStore.getState();
    dispatch({ type: "run.requested", rev: 0 });
    dispatch({ type: "run.started", rev: 0, runId: "r" });
    dispatch({
      type: "node.result",
      payload: {
        rev: 0,
        runId: "r",
        nodeId: "n",
        port: "out",
        ref: { id: "ref", rowCount: 2, schema: [{ name: "total", type: "number" }] },
      },
    });

    const field = screen.getByRole("group", { name: "Columnas de salida" });
    await userEvent.click(
      await within(field).findByRole("button", { name: "Copiar del último resultado" }),
    );

    expect(changes).toEqual([{ param: "columns", value: [{ name: "total", type: "number" }] }]);
  });

  it("offers no copy before the node has a result", () => {
    renderTyped({}, CODE);

    expect(screen.queryByRole("button", { name: "Copiar del último resultado" })).toBeNull();
  });
});
