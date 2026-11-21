import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dataTypeLabel, TypeGlyph } from "./TypeGlyph.tsx";

describe("TypeGlyph", () => {
  it.each([
    ["table", "Tabla", "rect"],
    ["column", "Columna", "rect"],
    ["value", "Valor", "circle"],
    ["geo", "Geotabla", "polygon"],
    ["image", "Imagen", "polygon"],
    ["model", "Modelo", "polygon"],
    ["chart", "Gráfico", "polygon"],
    ["any", "Cualquiera", "circle"],
  ] as const)("draws the %s type as a named shape", (type, label, shape) => {
    render(<TypeGlyph type={type} />);

    expect(screen.getByRole("img", { name: label }).querySelector(shape)).not.toBeNull();
  });

  it("is hollow when not filled", () => {
    render(<TypeGlyph type="table" filled={false} />);

    expect(screen.getByRole("img").classList.contains("nd-glyph-hollow")).toBe(true);
  });

  it("is always hollow for the any type", () => {
    render(<TypeGlyph type="any" />);

    expect(screen.getByRole("img").classList.contains("nd-glyph-hollow")).toBe(true);
  });

  it("doubles its shape when it accepts many connections", () => {
    render(<TypeGlyph type="value" multi />);

    expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(2);
  });
  it("sizes the default glyph from tokens", () => {
    render(<TypeGlyph type="table" />);
    expect(screen.getByRole("img").getAttribute("width")).toBe(
      "calc(var(--icon-md) - var(--space-1))",
    );
  });
});

it("names each data type the way ports describe it", () => {
  expect(dataTypeLabel("table")).toBe("Tabla");
});
