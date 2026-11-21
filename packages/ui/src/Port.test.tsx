import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Port } from "./Port.tsx";

describe("Port", () => {
  it("shows its name and the shape of its type", () => {
    render(<Port name="ventas" type="table" />);

    expect(screen.getByText("ventas")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Tabla" })).toBeTruthy();
  });

  it("falls back to the type name when unnamed", () => {
    render(<Port type="value" connected />);

    expect(screen.getByText("Valor")).toBeTruthy();
  });

  it("marks a required input that is not connected", () => {
    render(<Port direction="in" name="datos" type="table" />);

    expect(screen.getByTitle("Entrada obligatoria sin conectar")).toBeTruthy();
  });

  it.each([
    ["connected input", { direction: "in", connected: true }],
    ["optional input", { direction: "in", optional: true }],
    ["output", { direction: "out" }],
  ] as const)("does not mark a %s as missing", (_case, props) => {
    render(<Port name="datos" type="table" {...props} />);

    expect(screen.queryByTitle("Entrada obligatoria sin conectar")).toBeNull();
  });

  it("shows its type next to the name when asked", () => {
    render(<Port name="mapa" type="geo" showType connected />);

    expect(screen.getByText("Geotabla")).toBeTruthy();
  });

  it("says when it accepts many connections", () => {
    render(<Port name="tablas" type="table" multi connected />);

    expect(screen.getByTitle("Tabla · admite varias conexiones")).toBeTruthy();
  });

  it("reflects whether a dragged connection could land on it", () => {
    const { container } = render(<Port name="x" type="table" state="incompatible" />);

    expect(container.firstElementChild?.classList.contains("nd-port-incompatible")).toBe(true);
  });
});
