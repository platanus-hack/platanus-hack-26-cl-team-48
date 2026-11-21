import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColumnProfile } from "./ColumnProfile.tsx";

describe("ColumnProfile", () => {
  it("names the column and draws its distribution", () => {
    render(<ColumnProfile name="monto" type="number" count={100} bins={[1, 4, 2]} />);

    expect(screen.getByText("monto")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Distribución de monto" }).children).toHaveLength(3);
  });

  it("scales bars to the tallest bin", () => {
    render(<ColumnProfile name="monto" type="number" count={100} bins={[2, 4]} />);

    const bars = [...screen.getByRole("img").children].map((bar) => bar.getAttribute("style"));
    expect(bars).toEqual(["height: 50%;", "height: 100%;"]);
  });

  it("shows the share of null values", () => {
    render(<ColumnProfile name="monto" type="number" count={200} nulls={25} bins={[]} />);

    expect(screen.getByText(/^12,5\s%\snulos$/)).toBeTruthy();
  });

  it("shows the range, statistics and issues", () => {
    render(
      <ColumnProfile
        name="monto"
        type="number"
        count={10}
        bins={[1]}
        range={["0", "9.800"]}
        stats={[["media", "1.204"]]}
        issues="3 atípicos"
      />,
    );

    expect(screen.getByText("9.800")).toBeTruthy();
    expect(screen.getByRole("term").textContent).toBe("media");
    expect(screen.getByRole("definition").textContent).toBe("1.204");
    expect(screen.getByText("3 atípicos")).toBeTruthy();
  });
});
