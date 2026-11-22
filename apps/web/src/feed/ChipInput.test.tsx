import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChipInput } from "./ChipInput.tsx";

const LABEL = "Busco";

type HarnessProps = {
  readonly initial: ReadonlyArray<string>;
  readonly onChange: (values: string[]) => void;
  readonly onSubmit: () => void;
};

/** Holds the values like a real parent would, inside a form to observe submissions. */
function Harness({ initial, onChange, onSubmit }: HarnessProps) {
  const [values, setValues] = useState<ReadonlyArray<string>>(initial);
  return (
    <form
      aria-label="Formulario"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <ChipInput
        label={LABEL}
        values={values}
        onChange={(next: string[]) => {
          onChange(next);
          setValues(next);
        }}
      />
      <input aria-label="Otro campo" />
      <button type="submit">Enviar</button>
    </form>
  );
}

function renderChipInput(initial: ReadonlyArray<string> = []) {
  const onChange = vi.fn<(values: string[]) => void>();
  const onSubmit = vi.fn<() => void>();
  render(<Harness initial={initial} onChange={onChange} onSubmit={onSubmit} />);
  return { user: userEvent.setup(), onChange, onSubmit };
}

const textbox = () => screen.getByRole<HTMLInputElement>("textbox", { name: LABEL });

const chipCount = () =>
  screen.queryByRole("list", { name: LABEL }) === null
    ? 0
    : within(screen.getByRole("list", { name: LABEL })).queryAllByRole("listitem").length;

describe("ChipInput", () => {
  it("names the textbox with the label", () => {
    renderChipInput();

    expect(textbox()).toBeTruthy();
  });

  it("adds the trimmed text as a chip on Enter", async () => {
    const { user, onChange } = renderChipInput();

    await user.type(textbox(), "  datos  {Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["datos"]);
    expect(screen.getByRole("button", { name: "Quitar datos" })).toBeTruthy();
  });

  it("clears the textbox after adding a chip", async () => {
    const { user } = renderChipInput();

    await user.type(textbox(), "datos{Enter}");

    expect(textbox().value).toBe("");
  });

  it("adds a chip on comma", async () => {
    const { user, onChange } = renderChipInput();

    await user.type(textbox(), "datos,");

    expect({ values: onChange.mock.lastCall?.[0], text: textbox().value }).toEqual({
      values: ["datos"],
      text: "",
    });
  });

  it("adds the pending text on blur", async () => {
    const { user, onChange } = renderChipInput();
    await user.type(textbox(), "datos");

    await user.click(screen.getByRole("textbox", { name: "Otro campo" }));

    expect(onChange).toHaveBeenLastCalledWith(["datos"]);
  });

  it("appends new chips after the existing ones", async () => {
    const { user, onChange } = renderChipInput(["modelos"]);

    await user.type(textbox(), "datos{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["modelos", "datos"]);
  });

  it("ignores blank text", async () => {
    const { user, onChange } = renderChipInput();

    await user.type(textbox(), "   {Enter}");

    expect({ changed: onChange.mock.calls.length, chips: chipCount() }).toEqual({
      changed: 0,
      chips: 0,
    });
  });

  it("ignores a duplicate value", async () => {
    const { user } = renderChipInput(["datos"]);

    await user.type(textbox(), "datos{Enter}");

    expect(chipCount()).toBe(1);
  });

  it("renders the chips in a list named with the label", () => {
    renderChipInput(["modelos", "datos"]);

    expect(chipCount()).toBe(2);
  });

  it("removes a chip with its Quitar button", async () => {
    const { user, onChange } = renderChipInput(["modelos", "datos"]);

    await user.click(screen.getByRole("button", { name: "Quitar modelos" }));

    expect({
      values: onChange.mock.lastCall?.[0],
      removed: screen.queryByRole("button", { name: "Quitar modelos" }) === null,
    }).toEqual({ values: ["datos"], removed: true });
  });

  it("does not submit the surrounding form on Enter", async () => {
    const { user, onSubmit } = renderChipInput();

    await user.type(textbox(), "datos{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("removes exactly one entry when a value is repeated", async () => {
    const { user, onChange } = renderChipInput(["modelos", "modelos", "datos"]);
    const [firstRemove] = screen.getAllByRole("button", { name: "Quitar modelos" });
    if (firstRemove === undefined) throw new Error("No Quitar button for modelos");

    await user.click(firstRemove);

    expect({ values: onChange.mock.lastCall?.[0], chips: chipCount() }).toEqual({
      values: ["modelos", "datos"],
      chips: 2,
    });
  });
});
