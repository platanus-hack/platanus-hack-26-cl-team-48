import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HubContext } from "../hub/hub-context.ts";
import { createTestHub } from "../hub/hub-pages-fixtures.tsx";
import type { SavedFlowStatus } from "../library/saved-flow-store.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { FlowName } from "./FlowName.tsx";

function renderWithStatus(status: SavedFlowStatus) {
  const { stores } = renderWithStores(
    <HubContext value={createTestHub()}>
      <FlowName />
    </HubContext>,
  );
  act(() => {
    stores.savedFlowStore.setState({ status });
  });
}

const statusTexts = () => screen.getAllByRole("status").map((status) => status.textContent);

describe("FlowName status", () => {
  it("asks to sign in to save when signed out", () => {
    renderWithStatus("signed-out");

    expect(statusTexts()).toContain("Entra para guardar");
  });

  it("says the flow is unsaved without mentioning the browser", () => {
    renderWithStatus("unsaved");

    expect(statusTexts()).toContain("Sin guardar");
  });
});
