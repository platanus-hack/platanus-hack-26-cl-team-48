import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { PreviewFrame } from "./PreviewFrame.tsx";
import { DEFAULT_PREVIEW_SIZE } from "./preview-size.ts";
function Frame() {
  const [size, setSize] = useState(DEFAULT_PREVIEW_SIZE);
  return (
    <PreviewFrame size={size} onChange={setSize}>
      {(actions) => (
        <>
          {actions}
          <p>Content</p>
        </>
      )}
    </PreviewFrame>
  );
}
it("resizes with the keyboard, maximizes and restores the size", async () => {
  render(<Frame />);
  const separator = screen.getByRole("separator");
  separator.focus();
  await userEvent.keyboard("{ArrowUp}");
  expect(separator.getAttribute("aria-valuenow")).toBe("43");
  await userEvent.click(screen.getByRole("button", { name: "Ampliar vista previa" }));
  expect(screen.queryByRole("separator")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reducir vista previa" }));
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe("43");
});
it("resizes by captured dragging and stops after cancellation", () => {
  const rect = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue(new DOMRect(0, 0, 800, 1000));
  render(
    <div className="web-app">
      <Frame />
    </div>,
  );
  const separator = screen.getByRole("separator");
  const captured: number[] = [];
  separator.setPointerCapture = (pointerId) => {
    captured.push(pointerId);
  };
  const point = (type: string, clientY: number) => {
    const event = new MouseEvent(type, { bubbles: true, clientY, button: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    fireEvent(separator, event);
  };

  point("pointerdown", 400);
  point("pointermove", 300);

  expect(captured).toEqual([1]);
  expect(separator.getAttribute("aria-valuenow")).toBe("48");
  point("pointercancel", 300);
  point("pointermove", 100);
  expect(separator.getAttribute("aria-valuenow")).toBe("48");
  rect.mockRestore();
});

it("offers only the maximize action, as a labeled icon with a tooltip", () => {
  render(<Frame />);

  expect(screen.queryByRole("button", { name: "Colapsar vista previa" })).toBeNull();
  const button = screen.getByRole("button", { name: "Ampliar vista previa" });
  expect(button.getAttribute("title")).toBe("Ampliar vista previa");
  expect(button.querySelector("svg")).not.toBeNull();
  expect(button.textContent).toBe("");
});
