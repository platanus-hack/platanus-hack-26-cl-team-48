import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConditionBuilder } from "./ConditionBuilder.tsx";

const COLUMNS = [
  { name: "region", type: "text" },
  { name: "monto", type: "number" },
] as const;
const CONDITIONS = [
  { column: "region", op: "=", value: "Sur" },
  { column: "monto", op: ">", value: "abc", invalid: true },
];
const OPERATORS = ["=", ">", "<"];

function nth(elements: ReadonlyArray<HTMLElement>, index: number): HTMLElement {
  const element = elements[index];
  if (element === undefined) throw new Error(`No element at ${String(index)}`);
  return element;
}

describe("ConditionBuilder", () => {
  it("reads as a sentence: where, then the join between conditions", () => {
    render(<ConditionBuilder columns={COLUMNS} conditions={CONDITIONS} join="O" />);

    expect(screen.getByText("Donde")).toBeTruthy();
    expect(screen.getByRole("button", { name: "O" })).toBeTruthy();
  });

  it("shows each condition's column, operator and value", () => {
    render(<ConditionBuilder columns={COLUMNS} conditions={CONDITIONS} operators={OPERATORS} />);

    expect(screen.getByText("region")).toBeTruthy();
    expect(screen.getAllByRole("combobox", { name: "Operador" })[1]).toHaveProperty("value", ">");
    expect(screen.getAllByRole("textbox", { name: "Valor" })[0]).toHaveProperty("value", "Sur");
  });

  it("marks an invalid value", () => {
    render(<ConditionBuilder columns={COLUMNS} conditions={CONDITIONS} />);

    const values = screen.getAllByRole("textbox", { name: "Valor" });
    expect(values[0]?.getAttribute("aria-invalid")).toBeNull();
    expect(values[1]?.getAttribute("aria-invalid")).toBe("true");
  });

  it("asks to switch the join", async () => {
    const onJoinToggle = vi.fn();
    render(
      <ConditionBuilder columns={COLUMNS} conditions={CONDITIONS} onJoinToggle={onJoinToggle} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Y" }));

    expect(onJoinToggle).toHaveBeenCalledOnce();
  });

  it("reports a changed value or operator with the whole condition", async () => {
    const onConditionChange = vi.fn();
    render(
      <ConditionBuilder
        columns={COLUMNS}
        conditions={CONDITIONS}
        operators={OPERATORS}
        onConditionChange={onConditionChange}
      />,
    );

    await userEvent.type(nth(screen.getAllByRole("textbox", { name: "Valor" }), 0), "!");
    await userEvent.selectOptions(
      nth(screen.getAllByRole("combobox", { name: "Operador" }), 0),
      "<",
    );

    expect(onConditionChange).toHaveBeenNthCalledWith(1, 0, { ...CONDITIONS[0], value: "Sur!" });
    expect(onConditionChange).toHaveBeenNthCalledWith(2, 0, { ...CONDITIONS[0], op: "<" });
  });

  it("opens one column list at a time and reports the chosen column", async () => {
    const onColumnListToggle = vi.fn();
    const onConditionChange = vi.fn();
    render(
      <ConditionBuilder
        columns={COLUMNS}
        conditions={CONDITIONS}
        openColumnIndex={1}
        onColumnListToggle={onColumnListToggle}
        onConditionChange={onConditionChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "region" }));
    await userEvent.click(screen.getByRole("option", { name: /region/ }));

    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(onColumnListToggle).toHaveBeenCalledWith(0);
    expect(onConditionChange).toHaveBeenCalledWith(1, { ...CONDITIONS[1], column: "region" });
  });

  it("asks to remove a condition", async () => {
    const onRemoveCondition = vi.fn();
    render(
      <ConditionBuilder
        columns={COLUMNS}
        conditions={CONDITIONS}
        onRemoveCondition={onRemoveCondition}
      />,
    );

    await userEvent.click(nth(screen.getAllByRole("button", { name: "Quitar condición" }), 1));

    expect(onRemoveCondition).toHaveBeenCalledWith(1);
  });

  it("asks to add a condition or a group", async () => {
    const onAddCondition = vi.fn();
    const onAddGroup = vi.fn();
    render(
      <ConditionBuilder
        columns={COLUMNS}
        conditions={[]}
        onAddCondition={onAddCondition}
        onAddGroup={onAddGroup}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Condición" }));
    await userEvent.click(screen.getByRole("button", { name: "Grupo" }));

    expect(onAddCondition).toHaveBeenCalledOnce();
    expect(onAddGroup).toHaveBeenCalledOnce();
  });
});
