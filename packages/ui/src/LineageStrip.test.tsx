import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LineageEvent } from "./lineage.ts";
import { LineageStrip } from "./LineageStrip.tsx";

describe("LineageStrip", () => {
  it("renders a single line and no knots for an origin-only lineage", () => {
    const events: LineageEvent[] = ["origin"];

    const { container } = render(<LineageStrip events={events} />);

    expect(container.querySelectorAll("line")).toHaveLength(1);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("renders a knot circle when an adaptation occurs", () => {
    const events: LineageEvent[] = ["origin", "adapt"];

    const { container } = render(<LineageStrip events={events} />);

    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(1);
  });

  it("applies a custom class name when provided", () => {
    const customClass = "custom-lineage-strip";
    const events: LineageEvent[] = ["origin"];

    const { container } = render(<LineageStrip className={customClass} events={events} />);

    expect(container.firstElementChild?.classList.contains(customClass)).toBe(true);
  });
});
