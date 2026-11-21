import type { FlowNode, NodeManifest } from "@nodomics/protocol";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { createAppStores } from "../app-stores.ts";
import { edgeOf, flowOf, nodeOf } from "../canvas/canvas-fixtures.ts";
import { renderWithEngine } from "../testing/render-with-engine.tsx";
import { ParamsForm } from "./ParamsForm.tsx";

const MANIFEST: NodeManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      op: { title: "Operador", enum: ["=", ">"], default: "=" },
      value: { title: "Valor", type: "string" },
      code: { title: "Código", type: "string", "x-nodomics": { widget: "code" } },
    },
    required: ["column", "value"],
  },
  impl: { kind: "sql", template: "" },
};

const NODE: FlowNode = {
  id: "f1",
  type: "core.filter",
  version: "0.1.0",
  params: { op: "=" },
  position: { x: 0, y: 0 },
};

function renderForm(node: FlowNode = NODE) {
  const changes: { param: string; value: unknown }[] = [];
  const rendered = renderWithStores(
    <ParamsForm
      node={node}
      manifest={MANIFEST}
      issues={[{ nodeId: "f1", code: "PARAM_REQUIRED", message: "Falta el valor", param: "value" }]}
      onChange={(param, value) => changes.push({ param, value })}
    />,
  );
  return { changes, ...rendered };
}

describe("ParamsForm", () => {
  it("renders one labelled control per parameter", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Columna" })).toBeDefined();
    expect(screen.getByRole("combobox", { name: /Operador/ })).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Valor" })).toBeDefined();
    expect(screen.getByRole("textbox", { name: /Código/ })).toBeDefined();
  });

  it("reports text changes as parameter changes", async () => {
    const { changes } = renderForm();

    await userEvent.type(screen.getByRole("textbox", { name: "Valor" }), "S");

    expect(changes).toEqual([{ param: "value", value: "S" }]);
  });

  it("reports enum choices", async () => {
    const { changes } = renderForm();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /Operador/ }), ">");

    expect(changes).toEqual([{ param: "op", value: ">" }]);
  });

  it("shows the engine's configuration issue on its field", () => {
    renderForm();

    expect(screen.getByRole("alert").textContent).toContain("Falta el valor");
  });

  it("offers the columns the engine inferred for the port", async () => {
    const { changes, stores } = renderForm();
    stores.engineStore.getState().dispatch({
      type: "schema.inferred",
      rev: 0,
      nodeId: "f1",
      port: "in",
      columns: [{ name: "region", type: "text" }],
    });

    await userEvent.click(screen.getByRole("button", { name: "Columna" }));
    await userEvent.click(screen.getByRole("option", { name: /region/ }));

    expect(changes).toEqual([{ param: "column", value: "region" }]);
  });
});

it.each(["precio", "total"])("uses the input schema for the numeric %s chip", async (name) => {
  const stores = createAppStores(
    flowOf(
      [nodeOf("source", "core.source.sample"), NODE],
      [edgeOf("input", ["source", "out"], ["f1", "in"])],
    ),
  );
  stores.engineStore.getState().dispatch({ type: "flow.accepted", rev: 0, stale: [], errors: [] });
  renderWithEngine(
    <ParamsForm
      node={{ ...NODE, params: { column: name } }}
      manifest={MANIFEST}
      issues={[]}
      onChange={() => undefined}
    />,
    {
      stores,
      handlers: {
        "schema.infer": ({ nodeId, port }) => ({
          ok: true,
          columns: nodeId === "source" && port === "out" ? [{ name, type: "number" }] : [],
        }),
      },
    },
  );

  expect(
    await within(screen.getByRole("button", { name: "Columna" })).findByTitle("Número"),
  ).toBeDefined();
});

it("shows the default of an unset number as its placeholder, so the field does not look empty", () => {
  renderWithStores(
    <ParamsForm
      node={{ ...NODE, params: {} }}
      manifest={{
        ...MANIFEST,
        params: {
          type: "object",
          properties: { rows: { title: "Filas", type: "integer", default: 20 } },
        },
      }}
      issues={[]}
      onChange={() => undefined}
    />,
  );

  expect(screen.getByRole("spinbutton", { name: /Filas/ }).getAttribute("placeholder")).toBe("20");
});
