import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input.tsx";

describe("Input", () => {
  it("shows its value and placeholder", () => {
    render(<Input value="ventas" placeholder="Nombre" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("value", "ventas");
    expect(input.getAttribute("placeholder")).toBe("Nombre");
  });

  it("reports each change", async () => {
    const onChange = vi.fn();
    render(<Input value="" label="Nombre" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Nombre" }), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("is read-only without onChange", () => {
    render(<Input value="fijo" />);

    expect(screen.getByRole("textbox")).toHaveProperty("readOnly", true);
  });

  it("shows its unit", () => {
    render(<Input type="number" value="5" unit="%" />);

    expect(screen.getByText("%")).toBeTruthy();
  });

  it("can be disabled and marked invalid", () => {
    render(<Input disabled invalid />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("disabled", true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
