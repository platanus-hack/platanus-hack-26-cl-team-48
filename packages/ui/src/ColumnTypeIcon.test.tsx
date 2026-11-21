import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColumnTypeIcon } from "./ColumnTypeIcon.tsx";

describe("ColumnTypeIcon", () => {
  it.each([
    ["number", "Número"],
    ["text", "Texto"],
    ["date", "Fecha"],
    ["bool", "Booleano"],
    ["geo", "Geometría"],
  ] as const)("names the %s column type on hover", (type, label) => {
    render(<ColumnTypeIcon type={type} />);

    expect(screen.getByTitle(label)).toBeTruthy();
  });

  it("can show the type name as text", () => {
    render(<ColumnTypeIcon type="date" showLabel />);

    expect(screen.getByText("Fecha")).toBeTruthy();
  });
});
