import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import type { PreviewLocation } from "../layout/workspace-preferences.ts";
import { PreviewLocationControl } from "./PreviewLocationControl.tsx";

function Control() {
  const [location, setLocation] = useState<PreviewLocation>("nodes");
  return <PreviewLocationControl location={location} onChange={setLocation} />;
}

it("switches the preview between the nodes and the panel, showing which one is active", async () => {
  render(<Control />);
  const group = screen.getByRole("group", { name: "Dónde se muestra la vista previa" });
  const inNodes = screen.getByRole("button", { name: "En nodos" });
  const inPanel = screen.getByRole("button", { name: "En panel" });
  expect(group.contains(inNodes)).toBe(true);
  expect(inNodes.getAttribute("aria-pressed")).toBe("true");

  await userEvent.click(inPanel);

  expect(inPanel.getAttribute("aria-pressed")).toBe("true");
  expect(inNodes.getAttribute("aria-pressed")).toBe("false");
});
