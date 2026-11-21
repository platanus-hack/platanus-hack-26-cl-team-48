import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select.tsx";

describe("Select", () => {
  it("offers plain and labelled options", () => {
    render(<Select options={["=", { value: ">", label: "mayor que" }]} label="Operador" />);

    expect(screen.getByRole("option", { name: "=" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "mayor que" })).toHaveProperty("value", ">");
  });

  it("shows the selected value and reports a new choice", async () => {
    const onChange = vi.fn();
    render(<Select options={["asc", "desc"]} value="asc" label="Orden" onChange={onChange} />);
    const select = screen.getByRole("combobox", { name: "Orden" });
    expect(select).toHaveProperty("value", "asc");

    await userEvent.selectOptions(select, "desc");

    expect(onChange).toHaveBeenCalledWith("desc");
  });

  it("can be disabled", () => {
    render(<Select options={["a"]} disabled />);

    expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
  });
});
