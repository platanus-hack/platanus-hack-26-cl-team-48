import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Edge } from "./Edge.tsx";
import { Port } from "./Port.tsx";
import { dataTypeLabel, TypeGlyph } from "./TypeGlyph.tsx";

const HOSTING_TYPES = [
  ["repo", "Repositorio"],
  ["service", "Servicio"],
] as const;

describe.each(HOSTING_TYPES)("the %s data type", (type, label) => {
  it("is named in Spanish", () => {
    expect(dataTypeLabel(type)).toBe(label);
  });

  it("draws a glyph with its accessible name", () => {
    render(<TypeGlyph type={type} />);

    expect(screen.getByRole("img", { name: label }).firstElementChild).not.toBeNull();
  });

  it("shows the shape of its type on a port", () => {
    render(<Port name="origen" type={type} />);

    expect(screen.getByText("origen")).toBeTruthy();
    expect(screen.getByRole("img", { name: label })).toBeTruthy();
  });

  it("falls back to the type name on an unnamed port", () => {
    render(<Port type={type} connected />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  it("colors an edge with the class of its type", () => {
    render(<Edge from={{ x: 0, y: 0 }} to={{ x: 200, y: 50 }} type={type} />);

    expect(
      screen.getByRole("img", { name: "Conexión" }).classList.contains(`nd-type-${type}`),
    ).toBe(true);
  });
});
