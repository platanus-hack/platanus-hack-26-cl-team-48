import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Edge } from "./Edge.tsx";

const FROM = { x: 0, y: 0 };
const TO = { x: 200, y: 50 };

describe("Edge", () => {
  it("is announced as a connection", () => {
    render(<Edge from={FROM} to={TO} />);

    expect(screen.getByRole("img", { name: "Conexión" })).toBeTruthy();
  });

  it("takes the color of its data type and reflects its state", () => {
    render(<Edge from={FROM} to={TO} type="geo" state="stale" />);

    expect(screen.getByRole("img").getAttribute("class")).toBe("nd-edge nd-edge-stale nd-type-geo");
  });

  it("marks an invalid connection with a cross, not only color", () => {
    const { container } = render(<Edge from={FROM} to={TO} state="invalid" label="monto" />);

    expect(container.querySelector(".nd-edge-mark")).not.toBeNull();
    expect(screen.queryByText("monto")).toBeNull();
  });

  it("shows its label", () => {
    render(<Edge from={FROM} to={TO} label="31.207 filas" />);

    expect(screen.getByText("31.207 filas")).toBeTruthy();
    expect(screen.getByRole("img", { name: "31.207 filas" })).toBeTruthy();
  });

  it("shows how many comments it has instead of the label", () => {
    render(<Edge from={FROM} to={TO} comments={3} label="x" />);

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByText("x")).toBeNull();
  });

  it("is sized for inline use or positioned over the canvas", () => {
    const { rerender } = render(<Edge from={FROM} to={TO} inline />);
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("width")).toBe("224");
    expect(svg.style.position).toBe("");

    rerender(<Edge from={FROM} to={TO} />);

    expect(svg.style.position).toBe("absolute");
    expect(svg.style.left).toBe("-12px");
  });

  it("reports a click on the connection", async () => {
    const onSelect = vi.fn();
    const { container } = render(<Edge from={FROM} to={TO} onSelect={onSelect} />);

    await userEvent.click(container.querySelector(".nd-edge-hit") ?? document.body);

    expect(onSelect).toHaveBeenCalledOnce();
  });
  it("focuses selectable connections and selects with Enter and Space", async () => {
    const selections: string[] = [];
    render(
      <Edge from={FROM} to={TO} state="selected" onSelect={() => selections.push("selected")} />,
    );
    const edge = screen.getByRole("button", { name: "Conexión", pressed: true });
    await userEvent.tab();
    expect(document.activeElement).toBe(edge);
    await userEvent.keyboard("{Enter} ");
    expect(selections).toEqual(["selected", "selected"]);
  });
});
