import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ejecutar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Ejecutar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("names an icon-only button with its label", () => {
    render(<Button icon="play" label="Ejecutar hasta aquí" />);

    expect(screen.getByRole("button", { name: "Ejecutar hasta aquí" })).toBeTruthy();
  });

  it("is busy and does not respond while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Publicar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Publicar" });

    await userEvent.click(button);

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not respond when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Publicar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows its keyboard shortcut", () => {
    render(<Button shortcut="⌘↵">Ejecutar</Button>);

    expect(screen.getByText("⌘↵").tagName).toBe("KBD");
  });

  it("applies its variant and size", () => {
    render(
      <Button variant="danger" size="sm">
        Borrar
      </Button>,
    );

    expect(screen.getByRole("button").className).toContain("nd-btn-danger nd-btn-sm");
  });
});
