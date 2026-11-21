import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field, useFieldControlId } from "./index.ts";
import { Input } from "./Input.tsx";
import { Select } from "./Select.tsx";
import { Switch } from "./Switch.tsx";

function CustomTextarea() {
  return <textarea id={useFieldControlId()} />;
}

describe("Field", () => {
  it("labels a custom control through the public hook", () => {
    render(
      <Field label="Consulta">
        <CustomTextarea />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Consulta" }).id).not.toBe("");
  });

  it("leaves custom controls without a field id outside Field", () => {
    render(<CustomTextarea />);

    expect(screen.getByRole("textbox").hasAttribute("id")).toBe(false);
  });

  it("labels the control it wraps", () => {
    render(
      <Field label="Umbral">
        <Input value="10" />
      </Field>,
    );

    expect(screen.getByLabelText("Umbral")).toBe(screen.getByRole("textbox"));
  });

  it("labels selects and switches too", () => {
    render(
      <>
        <Field label="Orden">
          <Select options={["asc", "desc"]} />
        </Field>
        <Field label="Activo">
          <Switch />
        </Field>
      </>,
    );

    expect(screen.getByLabelText("Orden")).toBe(screen.getByRole("combobox"));
    expect(screen.getByLabelText("Activo")).toBe(screen.getByRole("switch"));
  });

  it("shows the error instead of the help and marks the control invalid", () => {
    render(
      <Field label="Umbral" help="Un número" error="Debe ser positivo">
        <Input value="-1" />
      </Field>,
    );

    expect(screen.getByRole("alert").textContent).toBe("Debe ser positivo");
    expect(screen.queryByText("Un número")).toBeNull();
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the help when there is no error", () => {
    render(
      <Field label="Umbral" help="Un número">
        <Input />
      </Field>,
    );

    expect(screen.getByText("Un número")).toBeTruthy();
  });

  it("says when the parameter is optional", () => {
    render(
      <Field label="Umbral" optional>
        <Input />
      </Field>,
    );

    expect(screen.getByText("(opcional)", { exact: false })).toBeTruthy();
  });

  it("shows exposure and linked variable badges", () => {
    render(
      <Field label="Umbral" exposed linkedVar="limite">
        <Input />
      </Field>,
    );

    expect(screen.getByText("Expuesto")).toBeTruthy();
    expect(screen.getByText("limite")).toBeTruthy();
  });

  it("offers to reset a modified value", async () => {
    const onReset = vi.fn();
    render(
      <Field label="Umbral" modified onReset={onReset}>
        <Input />
      </Field>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Volver al valor por defecto" }));

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("offers extra information", () => {
    render(
      <Field label="Umbral" info="Filas con valor menor se descartan">
        <Input />
      </Field>,
    );

    expect(screen.getByRole("button", { name: "Filas con valor menor se descartan" })).toBeTruthy();
  });
});
