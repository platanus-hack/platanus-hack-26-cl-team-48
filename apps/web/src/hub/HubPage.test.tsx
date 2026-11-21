import { err } from "@nodomics/protocol";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createSeededHub, createTestHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { HubPage } from "./HubPage.tsx";

const searchField = () => screen.getByLabelText("Buscar en el hub");
const kindSelect = () => screen.getByRole("combobox", { name: "Tipo" });
const cardTitled = async (title: string) => {
  const link = await screen.findByRole("link", { name: title });
  const card = link.closest("article");
  if (card === null) throw new Error(`The link "${title}" is not inside a card`);
  return card;
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("HubPage", () => {
  it("shows the Hub heading", async () => {
    renderWithHub(<HubPage />, await createSeededHub());

    expect(screen.getByRole("heading", { level: 1, name: "Hub" })).toBeTruthy();
  });

  it("offers a search field and a kind filter that starts at Todo", async () => {
    renderWithHub(<HubPage />, await createSeededHub());

    expect({
      search: searchField().tagName,
      kinds: within(kindSelect())
        .getAllByRole("option")
        .map((option) => option.textContent),
      selected: screen.getByRole<HTMLOptionElement>("option", { name: "Todo" }).selected,
    }).toEqual({ search: "INPUT", kinds: ["Todo", "Flujos", "Nodos"], selected: true });
  });

  it("shows one card per publication", async () => {
    renderWithHub(<HubPage />, await createSeededHub());

    await cardTitled("Clima diario");

    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("links each card's title to the publication page", async () => {
    renderWithHub(<HubPage />, await createSeededHub());

    const link = await screen.findByRole("link", { name: "Ventas por región" });

    expect(link.getAttribute("href")).toBe("/hub/ana/ventas");
  });

  it("shows the description and the owner's handle on each card", async () => {
    renderWithHub(<HubPage />, await createSeededHub());

    const card = await cardTitled("Clima diario");

    expect({
      description: within(card).queryByText("Temperaturas de cada día") !== null,
      owner: within(card).queryByText("@beto") !== null,
    }).toEqual({ description: true, owner: true });
  });

  it("narrows the results as the user types", async () => {
    const user = userEvent.setup();
    renderWithHub(<HubPage />, await createSeededHub());
    await cardTitled("Clima diario");

    await user.type(searchField(), "clima");

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1);
    });
    expect(screen.getByRole("link", { name: "Clima diario" })).toBeTruthy();
  });

  it("shows only node publications when Nodos is chosen", async () => {
    const user = userEvent.setup();
    renderWithHub(<HubPage />, await createSeededHub());
    await cardTitled("Clima diario");

    await user.selectOptions(kindSelect(), screen.getByRole("option", { name: "Nodos" }));

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(1);
    });
    expect(screen.getByRole("link", { name: "Limpiar texto" })).toBeTruthy();
  });

  it("shows only flow publications when Flujos is chosen", async () => {
    const user = userEvent.setup();
    renderWithHub(<HubPage />, await createSeededHub());
    await cardTitled("Clima diario");

    await user.selectOptions(kindSelect(), screen.getByRole("option", { name: "Flujos" }));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Limpiar texto" })).toBeNull();
    });
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("says nothing matches when the search finds no publication", async () => {
    const user = userEvent.setup();
    renderWithHub(<HubPage />, await createSeededHub());
    await cardTitled("Clima diario");

    await user.type(searchField(), "zzzz");

    expect(await screen.findByText("No hay publicaciones que coincidan")).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("says nothing matches when the hub is empty", async () => {
    renderWithHub(<HubPage />, createTestHub());

    expect(await screen.findByText("No hay publicaciones que coincidan")).toBeTruthy();
  });

  it("shows an alert when the hub cannot be reached", async () => {
    const hub = {
      ...(await createSeededHub()),
      search: () => Promise.resolve(err({ kind: "unavailable" as const })),
    };
    renderWithHub(<HubPage />, hub);

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("No se pudo cargar el hub");
  });

  it("goes to the publication within the app when its title is clicked", async () => {
    const user = userEvent.setup();
    renderWithHub(<HubPage />, await createSeededHub());

    await user.click(await screen.findByRole("link", { name: "Ventas por región" }));

    expect(window.location.pathname).toBe("/hub/ana/ventas");
  });
});
