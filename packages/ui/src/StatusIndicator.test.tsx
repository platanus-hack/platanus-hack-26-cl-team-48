import { MESSAGES } from "./messages.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIndicator, statusLabel } from "./StatusIndicator.tsx";

describe("StatusIndicator", () => {
  it.each([
    ["idle", "Sin ejecutar"],
    ["queued", "En cola"],
    ["done", "Listo"],
    ["cached", "Listo · caché"],
    ["stale", "Desactualizado"],
    ["error", "Error"],
    ["cancelled", "Cancelado"],
    ["incomplete", "Configuración incompleta"],
    ["credential", "Requiere credencial"],
  ] as const)("describes the %s state with text, not only color", (state, label) => {
    render(<StatusIndicator state={state} />);

    expect(screen.getByRole("status").textContent).toBe(label);
  });

  it("shows the progress of a running node", () => {
    render(<StatusIndicator state="running" progress={0.4} />);

    expect(screen.getByRole("status").textContent).toBe("Ejecutando 40\u00a0%");
  });

  it("names itself with the description it shows, since a status takes no name from its text", () => {
    render(<StatusIndicator state="done" />);

    expect(screen.getByRole("status", { name: "Listo" })).toBeDefined();
  });

  it("keeps the description as the accessible name when compact", () => {
    render(<StatusIndicator state="error" compact />);

    expect(screen.getByRole("status", { name: "Error" }).textContent).toBe("");
  });

  it("accepts a custom label", () => {
    render(<StatusIndicator state="warning" label="Columnas con nulos" />);

    expect(screen.getByRole("status").textContent).toBe("Columnas con nulos");
  });

  it("spins its icon only while running", () => {
    const { container } = render(<StatusIndicator state="running" />);

    expect(container.querySelector(".nd-spin")).not.toBeNull();
  });
});

it("names each state the way the indicator writes it, so screens can label what it marks", () => {
  expect(statusLabel("done")).toBe("Listo");
  expect(statusLabel("incomplete")).toBe(MESSAGES.conditions.incomplete);
});
