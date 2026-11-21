import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch.tsx";

describe("Switch", () => {
  it("is a switch named by its label that shows whether it is on", () => {
    render(<Switch checked label="Ignorar mayúsculas" />);

    expect(
      screen.getByRole("switch", { name: "Ignorar mayúsculas" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("asks to flip its state when pressed", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} label="Activo" onChange={onChange} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
