import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { createAppStores } from "../app-stores.ts";
import { nodeOf } from "../canvas/canvas-fixtures.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { ParamsForm } from "./ParamsForm.tsx";
import type { NodeManifest } from "@nodomics/protocol";

const API: NodeManifest = {
  id: "core.source.api",
  version: "0.1.0",
  name: "API",
  category: "Fuentes",
  inputs: [],
  outputs: [],
  impl: { kind: "sql", template: "" },
  params: {
    type: "object",
    properties: {
      headers: { title: "Encabezados", type: "array", "x-nodomics": { widget: "key-values" } },
    },
  },
};

it("edits literal entries and switches to saved credential references without retaining the literal", async () => {
  const stores = createAppStores();
  await stores.secretStore.getState().save({ name: "api-token", value: "hidden" });
  const changes: unknown[] = [];
  const renderForm = (headers: unknown) => (
    <ParamsForm
      node={{ ...nodeOf("api", API.id), params: { headers } }}
      manifest={API}
      issues={[]}
      onChange={(_param, value) => changes.push(value)}
    />
  );
  const { rerender } = renderWithStores(
    renderForm([{ name: "Authorization", value: "literal" }]),
    stores,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
    target: { value: "X-Token" },
  });
  expect(changes.at(-1)).toEqual([{ name: "X-Token", value: "literal" }]);
  await userEvent.click(screen.getByRole("switch", { name: "Usar credencial" }));
  expect(changes.at(-1)).toEqual([{ name: "Authorization", secret: "" }]);
  rerender(<Stores stores={stores}>{renderForm(changes.at(-1))}</Stores>);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Credencial" }), "api-token");
  expect(changes.at(-1)).toEqual([{ name: "Authorization", secret: "api-token" }]);
  expect(screen.queryByDisplayValue("hidden")).toBeNull();
  rerender(<Stores stores={stores}>{renderForm(changes.at(-1))}</Stores>);
  await userEvent.click(screen.getByRole("switch", { name: "Usar credencial" }));
  expect(changes.at(-1)).toEqual([{ name: "Authorization", value: "" }]);
});

import { AppStoresContext as StoresContext } from "../app-context.ts";
import type { AppStores } from "../app-stores.ts";
import type { ReactNode } from "react";
function Stores({
  stores,
  children,
}: {
  readonly stores: AppStores;
  readonly children: ReactNode;
}) {
  return <StoresContext value={stores}>{children}</StoresContext>;
}

it("warns about missing credentials, reacts to their deletion and adds and removes rows", async () => {
  const stores = createAppStores();
  await stores.secretStore.getState().save({ name: "token", value: "hidden" });
  const changes: unknown[] = [];
  renderWithStores(
    <ParamsForm
      node={{
        ...nodeOf("api", API.id),
        params: { headers: [{ name: "Authorization", secret: "token" }] },
      }}
      manifest={API}
      issues={[]}
      onChange={(_param, value) => changes.push(value)}
    />,
    stores,
  );
  expect(screen.queryByText("No existe la credencial «token»")).toBeNull();
  await act(() => stores.secretStore.getState().remove("token"));
  expect(screen.getByText("No existe la credencial «token»")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
  expect(changes.at(-1)).toEqual([
    { name: "Authorization", secret: "token" },
    { name: "", value: "" },
  ]);
  await userEvent.click(screen.getByRole("button", { name: "Quitar" }));
  expect(changes.at(-1)).toEqual([]);
});

it("gives every row control its own accessible field association", () => {
  renderWithStores(
    <ParamsForm
      node={{
        ...nodeOf("api", API.id),
        params: {
          headers: [
            { name: "A", value: "one" },
            { name: "B", value: "two" },
          ],
        },
      }}
      manifest={API}
      issues={[]}
      onChange={() => undefined}
    />,
  );

  const ids = [...screen.getAllByRole("textbox"), ...screen.getAllByRole("switch")].map(
    (control) => control.id,
  );
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => id !== "")).toBe(true);
});

it("loads saved credential names even without an engine connection", async () => {
  const stores = createAppStores();
  await stores.savedFlowStore
    .getState()
    .library.saveSecret({ name: "saved-token", value: "hidden" });
  renderWithStores(
    <ParamsForm
      node={{
        ...nodeOf("api", API.id),
        params: { headers: [{ name: "Authorization", secret: "saved-token" }] },
      }}
      manifest={API}
      issues={[]}
      onChange={() => undefined}
    />,
    stores,
  );

  expect(await screen.findByRole("option", { name: "saved-token" })).toBeTruthy();
  await waitFor(() => {
    expect(screen.queryByText("No existe la credencial «saved-token»")).toBeNull();
  });
});
