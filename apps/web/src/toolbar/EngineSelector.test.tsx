import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createEngineRegistry } from "../engine-registry.ts";
import type { EngineEntry } from "../engine/engine-entry.ts";
import { startFakeEngine } from "../testing/fake-engine.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { EngineSelector } from "./EngineSelector.tsx";

function setup() {
  const urls: string[] = [];
  const engines = createEngineRegistry((url) => {
    urls.push(url);
    return startFakeEngine().transport;
  });
  const first = engines[0];
  if (first === undefined) throw new Error("Missing default engine");
  function Selector({ initial }: { readonly initial: EngineEntry }) {
    const [engine, setEngine] = useState<EngineEntry>(initial);
    return (
      <EngineSelector
        engines={engines}
        engine={engine}
        onEngineChange={(picked) => {
          setEngine(picked);
          picked.connect();
        }}
      />
    );
  }
  const { stores } = renderWithStores(<Selector initial={first} />);
  return { urls, stores };
}

describe("engine selection", () => {
  it("lists browser first, local second and mock last", () => {
    setup();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Navegador",
      "Python local",
      "Simulado",
    ]);
  });

  it("asks for an address, displays errors and connects with a parsed address", async () => {
    const { urls } = setup();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motor" }), "python-local");
    expect(urls).toEqual([]);
    expect(screen.getByText(/permiso.*localhost/)).toBeDefined();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Dirección del motor local" }),
      "ws://example.com/?token=x",
    );
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(screen.getByText(/loopback/)).toBeDefined();
    expect(urls).toEqual([]);
    await userEvent.clear(screen.getByRole("textbox", { name: "Dirección del motor local" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Dirección del motor local" }),
      "ws://127.0.0.1:7341/?token=a%2Bb%26c",
    );
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    const localWorker = new URL(urls[0] ?? "", window.location.href);
    expect(localWorker.searchParams.get("local")).toBe("ws://127.0.0.1:7341/");
    expect(localWorker.searchParams.get("token")).toBe("a+b&c");
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motor" }), "browser");
    expect(new URL(urls[1] ?? "", window.location.href).searchParams.has("local")).toBe(false);
    expect(new URL(urls[1] ?? "", window.location.href).searchParams.has("token")).toBe(false);
    expect(localWorker.pathname).toBe(new URL(urls[1] ?? "", window.location.href).pathname);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Motor" }), "python-local");
    expect(urls).toHaveLength(2);
    expect(screen.getByRole("textbox")).toHaveProperty(
      "value",
      "ws://127.0.0.1:7341/?token=a%2Bb%26c",
    );
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "ws://localhost:7341/?token=new");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(new URL(urls[2] ?? "", window.location.href).searchParams.get("token")).toBe("new");
  });
  it("reopens the local address after a failed connection and allows retrying", async () => {
    const { urls, stores } = setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "python-local");
    await userEvent.type(screen.getByRole("textbox"), "ws://localhost:7341/?token=old");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));

    act(() => {
      stores.engineStore
        .getState()
        .dispatch({ type: "session.connecting", engineId: "python-local" });
      stores.engineStore.getState().dispatch({ type: "session.failed", reason: "unreachable" });
    });

    expect(screen.getByRole("textbox")).toHaveProperty("value", "ws://localhost:7341/?token=old");
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "ws://localhost:7341/?token=new");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));
    expect(urls).toHaveLength(2);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("submits the local address with Enter", async () => {
    const { urls } = setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "python-local");

    await userEvent.type(screen.getByRole("textbox"), "ws://localhost:7341/?token=x{Enter}");

    expect(urls).toHaveLength(1);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
