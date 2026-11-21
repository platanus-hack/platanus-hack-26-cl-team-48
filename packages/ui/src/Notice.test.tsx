import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";
import { Notice } from "./Notice.tsx";

describe("Notice", () => {
  it("announces errors as alerts", () => {
    render(<Notice tone="error" title="No pudimos leer el archivo" />);

    expect(screen.getByRole("alert").textContent).toContain("No pudimos leer el archivo");
  });

  it("announces other tones as status", () => {
    render(<Notice tone="ok">Guardado</Notice>);

    expect(screen.getByRole("status").textContent).toContain("Guardado");
  });

  it("folds the technical detail", () => {
    render(<Notice tone="error" title="Falló" detail="KeyError: 'monto'" />);

    expect(screen.getByText("Detalle técnico").tagName).toBe("SUMMARY");
    expect(screen.getByText("KeyError: 'monto'").closest("details")?.open).toBe(false);
  });

  it("shows its actions", () => {
    render(<Notice actions={<Button>Elegir otro archivo</Button>} />);

    expect(screen.getByRole("button", { name: "Elegir otro archivo" })).toBeTruthy();
  });

  it("can be closed only when it has onClose", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Notice title="Aviso" />);
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();

    rerender(<Notice title="Aviso" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
  it("omits the close button when onClose is null", () => {
    render(<Notice onClose={null} />);
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });
});
