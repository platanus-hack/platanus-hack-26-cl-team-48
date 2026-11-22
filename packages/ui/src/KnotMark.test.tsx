import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnotMark } from "./KnotMark.tsx";

describe("KnotMark", () => {
  it("renders with img role and accessible name when title is provided", () => {
    const accessibleTitle = "Nodomics knot mark";

    render(<KnotMark title={accessibleTitle} />);

    expect(screen.getByRole("img", { name: accessibleTitle })).toBeTruthy();
  });

  it("renders as aria-hidden and without img role when title is omitted", () => {
    const component = <KnotMark />;

    const { container } = render(component);

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies a custom class name when provided", () => {
    const customClass = "custom-knot-mark";

    const { container } = render(<KnotMark className={customClass} />);

    expect(container.firstElementChild?.classList.contains(customClass)).toBe(true);
  });
});
