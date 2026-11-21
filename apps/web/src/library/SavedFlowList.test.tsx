import type { Hub } from "@nodomics/hub";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppStores, type AppStores } from "../app-stores.ts";
import { HubContext } from "../hub/hub-context.ts";
import { renderWithStores } from "../testing/render-with-stores.tsx";
import { cloudStores, createFlowsHub, savedFlowOf, signedInHub } from "./cloud-flow-fixtures.ts";
import { SavedFlowList } from "./SavedFlowList.tsx";

function renderList(stores: AppStores, hub: Hub = createFlowsHub()) {
  return renderWithStores(
    <HubContext value={hub}>
      <SavedFlowList />
    </HubContext>,
    stores,
  );
}

function renderSignedOut() {
  const stores = createAppStores();
  stores.savedFlowStore.setState({ status: "signed-out" });
  renderList(stores);
}

async function renderWithCloudFlows() {
  const hub = await signedInHub();
  const { stores, library } = cloudStores(hub);
  await library.saveFlow(savedFlowOf("Ventas"));
  await library.saveFlow(savedFlowOf("Compras", { visibility: "public" }));
  await stores.savedFlowStore.getState().refresh();
  renderList(stores, hub);
  return { stores, library };
}

const card = (name: string) => screen.getByRole("article", { name });

describe("SavedFlowList signed out", () => {
  it("does not invite to sign in, since the rail hides Mis flujos without an account", () => {
    renderSignedOut();

    expect(screen.queryByText("Entra para guardar tus flujos en tu cuenta.")).toBeNull();
  });

  it("does not show the empty list text", () => {
    renderSignedOut();

    expect(screen.queryByText("Todavía no hay flujos guardados.")).toBeNull();
  });

  it("offers no sign-in button when signed out", () => {
    renderSignedOut();

    expect(screen.queryByRole("button", { name: "Entrar" })).toBeNull();
  });

  it("offers no sign-in button when signed in", async () => {
    await renderWithCloudFlows();

    expect(screen.queryByRole("button", { name: "Entrar" })).toBeNull();
  });
});

describe("SavedFlowList visibility", () => {
  it("shows a private flow as private", async () => {
    await renderWithCloudFlows();

    expect(within(card("Ventas")).getByText("Privado")).toBeDefined();
  });

  it("shows a public flow as public", async () => {
    await renderWithCloudFlows();

    expect(within(card("Compras")).getByText("Público")).toBeDefined();
  });

  it("shows a flow without visibility as private", async () => {
    const stores = createAppStores();
    await stores.savedFlowStore.getState().library.saveFlow(savedFlowOf("Ventas"));
    await stores.savedFlowStore.getState().refresh();

    renderList(stores);

    expect(within(card("Ventas")).getByText("Privado")).toBeDefined();
  });

  it("offers to make a private flow public", async () => {
    await renderWithCloudFlows();

    expect(within(card("Ventas")).queryByRole("button", { name: "Hacer público" })).not.toBeNull();
    expect(within(card("Ventas")).queryByRole("button", { name: "Hacer privado" })).toBeNull();
  });

  it("offers to make a public flow private", async () => {
    await renderWithCloudFlows();

    expect(within(card("Compras")).queryByRole("button", { name: "Hacer privado" })).not.toBeNull();
    expect(within(card("Compras")).queryByRole("button", { name: "Hacer público" })).toBeNull();
  });

  it("makes a private flow public", async () => {
    const { library } = await renderWithCloudFlows();

    await userEvent.click(within(card("Ventas")).getByRole("button", { name: "Hacer público" }));

    await waitFor(async () => {
      expect((await library.readFlow("Ventas")).value?.visibility).toBe("public");
    });
  });

  it("shows the new visibility once a public flow is made private", async () => {
    await renderWithCloudFlows();

    await userEvent.click(within(card("Compras")).getByRole("button", { name: "Hacer privado" }));

    expect(await within(card("Compras")).findByText("Privado")).toBeDefined();
  });
});
