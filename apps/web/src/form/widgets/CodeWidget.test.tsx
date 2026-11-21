import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CodeEditorSizeContext } from "../../layout/code-editor-size.ts";
import { renderWithStores } from "../../testing/render-with-stores.tsx";
import type { FormField } from "../form-fields.ts";
import { CodeWidget } from "./CodeWidget.tsx";

const field: FormField = {
  name: "code",
  label: "Código",
  isRequired: true,
  defaultValue: undefined,
  widget: { kind: "code", language: "python" },
};

function renderWidget() {
  const changes: unknown[] = [];
  const rowsChosen: number[] = [];
  renderWithStores(
    <CodeEditorSizeContext
      value={{
        rows: 12,
        onResize: (rows) => {
          rowsChosen.push(rows);
        },
      }}
    >
      <CodeWidget
        field={field}
        widget={{ kind: "code", language: "python" }}
        value={"def transform(inputs):\n    return inputs\n"}
        nodeId="py"
        onChange={(value) => changes.push(value)}
        FieldView={() => null}
      />
    </CodeEditorSizeContext>,
  );
  return { changes, rowsChosen };
}

const editorLoaded = async () => {
  await act(async () => {
    await import("./code-editor/CodeEditor.tsx");
  });
};

describe("CodeWidget", () => {
  it("grows the editor downwards from the separator under it", async () => {
    const { rowsChosen } = renderWidget();
    const separator = screen.getByRole("separator", { name: "Redimensionar editor de código" });

    expect(separator.getAttribute("aria-valuetext")).toBe("12 líneas");
    separator.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(rowsChosen).toEqual([13]);
  });

  it("edits the code in the plain text area while the editor loads", async () => {
    const { changes } = renderWidget();

    await userEvent.type(screen.getByRole("textbox", { name: "Código" }), "#");

    expect(changes.at(-1)).toMatch(/#$/);
  });

  it("shows the code in a labelled code editor once it loads", async () => {
    renderWidget();
    await editorLoaded();

    const editor = await screen.findByRole("textbox", { name: "Código" });
    expect(editor.classList.contains("cm-content")).toBe(true);
    expect(editor.textContent).toContain("def transform(inputs):");
  });

  it("explains how to leave the editor with the keyboard", () => {
    renderWidget();

    expect(screen.getByText(/Esc y luego Tab/)).toBeDefined();
  });

  it("opens a larger editor and closes it with Escape, returning the focus", async () => {
    renderWidget();
    await editorLoaded();
    const expand = screen.getByRole("button", { name: "Ampliar editor" });

    await userEvent.click(expand);
    const dialog = await screen.findByRole("dialog", { name: "Código" });
    expect(await within(dialog).findByRole("textbox", { name: "Código" })).toBeDefined();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(expand);
  });
});
