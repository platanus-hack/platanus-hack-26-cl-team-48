import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrustBadge } from "./TrustBadge.tsx";

describe("TrustBadge", () => {
  it.each([
    ["official", "Oficial"],
    ["verified", "Verificado"],
    ["org", "Organización"],
    ["community", "Comunitario"],
    ["deprecated", "Obsoleto"],
  ] as const)("names the %s level", (level, label) => {
    render(<TrustBadge level={level} />);

    expect(screen.getByText(label)).toBeTruthy();
  });

  it("accepts a custom label", () => {
    render(<TrustBadge level="org" label="Acme" />);

    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("keeps the label as the accessible name when compact", () => {
    render(<TrustBadge level="verified" compact />);

    expect(screen.getByRole("img", { name: "Verificado" })).toBeTruthy();
  });
});
