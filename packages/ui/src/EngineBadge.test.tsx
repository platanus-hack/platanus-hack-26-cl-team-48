import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EngineBadge } from "./EngineBadge.tsx";

describe("EngineBadge", () => {
  it("names the engine and explains where the data goes", () => {
    render(<EngineBadge engine="cloud" />);

    expect(screen.getByText("Nube").getAttribute("title")).toBe(
      "Los datos se procesan en servidores",
    );
  });

  it("shows extra detail next to the engine", () => {
    render(<EngineBadge engine="local" detail="3.12" />);

    expect(screen.getByText("3.12")).toBeTruthy();
  });

  it("keeps the engine name as the accessible name when compact", () => {
    render(<EngineBadge engine="browser" compact />);

    expect(screen.getByRole("img", { name: "Navegador" })).toBeTruthy();
  });
});
