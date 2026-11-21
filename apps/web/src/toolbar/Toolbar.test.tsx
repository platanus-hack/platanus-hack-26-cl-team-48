import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { nodeOf } from "../canvas/canvas-fixtures.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { Toolbar } from "./Toolbar.tsx";

const entry = (id: string, label: string): EngineEntry => ({
  id,
  label,
  badge: "browser",
  connect: () => startFakeEngine().transport,
});

const ENGINES = [entry("mock", "Simulado"), entry("local", "Python local")];

function renderToolbar() {
  const picked: EngineEntry[] = [];
  const rendered = renderWithStores(
    <Toolbar
      engines={ENGINES}
      engine={ENGINES[0] ?? entry("none", "")}
      onEngineChange={(engine) => picked.push(engine)}
    />,
  );
  return { picked, ...rendered };
}

describe("Toolbar", () => {
  it("lets the user pick another engine", async () => {
    const { picked } = renderToolbar();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motor" }), "local");

    expect(picked.map((engine) => engine.id)).toEqual(["local"]);
  });

  it("undoes and redoes flow edits", async () => {
    const { stores } = renderToolbar();
    stores.flowStore.getState().dispatch({ type: "node.add", node: nodeOf("a", "core.filter") });

    await userEvent.click(await screen.findByRole("button", { name: "Deshacer" }));
    const afterUndo = stores.flowStore.getState().state.flow.nodes.length;
    await userEvent.click(screen.getByRole("button", { name: "Rehacer" }));

    expect(afterUndo).toBe(0);
    expect(stores.flowStore.getState().state.flow.nodes).toHaveLength(1);
  });

  it("disables undo when there is nothing to undo", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: "Deshacer" }).hasAttribute("disabled")).toBe(true);
  });

  it("disables running while there is no engine connected", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: /Ejecutar/ }).hasAttribute("disabled")).toBe(true);
  });

  it("does not offer conversion even with several selected nodes", () => {
    const { stores } = renderToolbar();
    stores.selectionStore.getState().select(["a", "b"]);
    expect(screen.queryByRole("button", { name: "Convertir en nodo" })).toBeNull();
  });
});
