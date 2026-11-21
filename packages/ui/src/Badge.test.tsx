import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge.tsx";

describe("Badge", () => {
  it("shows its content in the neutral tone by default", () => {
    render(<Badge>Expuesto</Badge>);

    expect(screen.getByText("Expuesto").className).toContain("nd-badge-neutral");
  });

  it("shows a decorative icon in the requested tone", () => {
    const { container } = render(
      <Badge tone="warn" icon="triangle-alert">
        12 % nulos
      </Badge>,
    );

    expect(screen.getByText("12 % nulos").className).toContain("nd-badge-warn");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
