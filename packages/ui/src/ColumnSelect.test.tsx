import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColumnSelect } from "./ColumnSelect.tsx";
import { Field } from "./Field.tsx";

const COLUMNS = [
  { name: "region", type: "text" },
  { name: "monto", type: "number", hint: "0 – 9.800" },
  { name: "fecha", type: "date" },
] as const;

describe("ColumnSelect", () => {
  it("invites to choose when nothing is selected", () => {
    render(<ColumnSelect columns={COLUMNS} />);

    expect(screen.getByRole("button", { name: "Elegir columna" })).toBeTruthy();
  });

  it("shows the selected columns", () => {
    render(<ColumnSelect columns={COLUMNS} value={["region", "monto"]} multiple />);

    expect(screen.getByText("region")).toBeTruthy();
    expect(screen.getByText("monto")).toBeTruthy();
  });

  it("is labelled by its field", () => {
    render(
      <Field label="Columna">
        <ColumnSelect columns={COLUMNS} />
      </Field>,
    );

    expect(screen.getByLabelText("Columna").getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("asks to open the list from the trigger", async () => {
    const onToggle = vi.fn();
    render(<ColumnSelect columns={COLUMNS} onToggle={onToggle} />);
    const trigger = screen.getByRole("button", { name: "Elegir columna" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();

    await userEvent.click(trigger);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("lists every column with its hint and marks the selected one", () => {
    render(<ColumnSelect columns={COLUMNS} value={["monto"]} open />);

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { selected: true }).textContent).toContain("monto");
    expect(screen.getByText("0 – 9.800")).toBeTruthy();
  });

  it("replaces the choice when it holds one column", async () => {
    const onChange = vi.fn();
    render(<ColumnSelect columns={COLUMNS} value={["region"]} open onChange={onChange} />);

    await userEvent.click(screen.getByRole("option", { name: /fecha/ }));

    expect(onChange).toHaveBeenCalledWith(["fecha"]);
  });

  it("adds and removes columns when it holds many", async () => {
    const onChange = vi.fn();
    render(<ColumnSelect columns={COLUMNS} value={["region"]} multiple open onChange={onChange} />);

    await userEvent.click(screen.getByRole("option", { name: /fecha/ }));
    await userEvent.click(screen.getByRole("option", { name: /region/ }));

    expect(onChange).toHaveBeenNthCalledWith(1, ["region", "fecha"]);
    expect(onChange).toHaveBeenNthCalledWith(2, []);
  });

  it("does not offer columns of other types", async () => {
    const onChange = vi.fn();
    render(<ColumnSelect columns={COLUMNS} filterType={["number"]} open onChange={onChange} />);
    const region = screen.getByRole("option", { name: /region/ });

    await userEvent.click(region);

    expect(region.getAttribute("aria-disabled")).toBe("true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects every offered column at once", async () => {
    const onChange = vi.fn();
    render(
      <ColumnSelect
        columns={COLUMNS}
        filterType={["text", "date"]}
        multiple
        open
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Seleccionar todas" }));

    expect(onChange).toHaveBeenCalledWith(["region", "fecha"]);
  });

  it("reports what the user searches", async () => {
    const onSearchChange = vi.fn();
    render(<ColumnSelect columns={COLUMNS} open search="" onSearchChange={onSearchChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Buscar columna" }), "m");

    expect(onSearchChange).toHaveBeenCalledWith("m");
  });
  it("names its listbox and keeps the search and select-all controls outside it", () => {
    render(<ColumnSelect columns={COLUMNS} multiple open />);
    const listbox = screen.getByRole("listbox", { name: "Elegir columna" });
    expect(listbox.contains(screen.getByRole("textbox"))).toBe(false);
    expect(listbox.contains(screen.getByRole("button", { name: "Seleccionar todas" }))).toBe(false);
  });

  it("moves focus with arrows and toggles choices with Enter and Space", async () => {
    const selections: ReadonlyArray<string>[] = [];
    render(
      <ColumnSelect
        columns={COLUMNS}
        value={["region"]}
        multiple
        open
        filterType={["text", "date"]}
        onChange={(value) => selections.push(value)}
      />,
    );
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /region/ }));
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /fecha/ }));
    await userEvent.keyboard("{Enter}{ArrowUp} ");
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /region/ }));
    expect(selections).toEqual([["region", "fecha"], []]);
  });
});
