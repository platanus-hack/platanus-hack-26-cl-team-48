import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import { ResizeHandle, type ResizeEdge } from "./ResizeHandle.tsx";

const RANGE = { min: 2, max: 10, step: 1 };

function Resizable({ edge, unitsPerPixel = 0.1 }: { edge: ResizeEdge; unitsPerPixel?: number }) {
  const [value, setValue] = useState(5);
  return (
    <ResizeHandle
      edge={edge}
      label="Redimensionar"
      controls="content"
      range={RANGE}
      value={value}
      valueText={`${String(value)} filas`}
      unitsPerPixel={() => unitsPerPixel}
      onResize={setValue}
    />
  );
}

const drag = (separator: HTMLElement, from: { x: number; y: number }, to: typeof from) => {
  separator.setPointerCapture = () => undefined;
  separator.hasPointerCapture = () => false;
  const point = (type: string, { x, y }: typeof from) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    fireEvent(separator, event);
  };
  point("pointerdown", from);
  point("pointermove", to);
  point("pointerup", to);
};

it("names the separator and reports its value", () => {
  render(<Resizable edge="bottom" />);
  const separator = screen.getByRole("separator", { name: "Redimensionar" });

  expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
  expect(separator.getAttribute("aria-valuenow")).toBe("5");
  expect(separator.getAttribute("aria-valuetext")).toBe("5 filas");
  expect(separator.getAttribute("aria-controls")).toBe("content");
});

it.each<[ResizeEdge, string, string]>([
  ["top", "{ArrowUp}", "6"],
  ["top", "{ArrowDown}", "4"],
  ["bottom", "{ArrowDown}", "6"],
  ["left", "{ArrowLeft}", "6"],
  ["right", "{ArrowRight}", "6"],
  ["left", "{ArrowUp}", "5"],
])("on the %s edge, %s moves the edge one step", async (edge, key, expected) => {
  render(<Resizable edge={edge} />);
  const separator = screen.getByRole("separator");
  separator.focus();

  await userEvent.keyboard(key);

  expect(separator.getAttribute("aria-valuenow")).toBe(expected);
});

it("grows as its edge is dragged away from the content, within the range", () => {
  render(<Resizable edge="left" />);
  const separator = screen.getByRole("separator");

  expect(separator.getAttribute("aria-orientation")).toBe("vertical");
  drag(separator, { x: 500, y: 0 }, { x: 480, y: 40 });
  expect(separator.getAttribute("aria-valuenow")).toBe("7");
  drag(separator, { x: 500, y: 0 }, { x: 0, y: 0 });
  expect(separator.getAttribute("aria-valuenow")).toBe("10");
});

it("ignores a drag when the content cannot be measured", () => {
  render(<Resizable edge="bottom" unitsPerPixel={0} />);
  const separator = screen.getByRole("separator");

  drag(separator, { x: 0, y: 0 }, { x: 0, y: 300 });

  expect(separator.getAttribute("aria-valuenow")).toBe("5");
});
