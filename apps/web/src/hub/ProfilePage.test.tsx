import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createSeededHub, renderWithHub } from "./hub-pages-fixtures.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("ProfilePage", () => {
  it("shows the profile's display name as the heading", async () => {
    renderWithHub(<ProfilePage handle="ana" />, await createSeededHub());

    expect(await screen.findByRole("heading", { level: 1, name: "Ana Pérez" })).toBeTruthy();
  });

  it("shows the profile's handle", async () => {
    renderWithHub(<ProfilePage handle="carla" />, await createSeededHub());

    await screen.findByRole("heading", { level: 1, name: "Carla Gómez" });

    expect(screen.getByText("@carla")).toBeTruthy();
  });

  it("shows one card per publication of the profile and none of others", async () => {
    renderWithHub(<ProfilePage handle="ana" />, await createSeededHub());

    await screen.findByRole("link", { name: "Ventas por región" });

    expect({
      cards: screen.getAllByRole("article").length,
      node: screen.queryByRole("link", { name: "Limpiar texto" }) !== null,
      others: screen.queryByRole("link", { name: "Clima diario" }) !== null,
    }).toEqual({ cards: 2, node: true, others: false });
  });

  it("links each card's title to the publication page and shows its description", async () => {
    renderWithHub(<ProfilePage handle="beto" />, await createSeededHub());

    const link = await screen.findByRole("link", { name: "Clima diario" });

    const card = link.closest("article");
    expect({
      href: link.getAttribute("href"),
      description: card !== null && within(card).queryByText("Temperaturas de cada día") !== null,
    }).toEqual({ href: "/hub/beto/clima", description: true });
  });

  it("says the profile has not published anything yet", async () => {
    renderWithHub(<ProfilePage handle="carla" />, await createSeededHub());

    expect(await screen.findByText("Todavía no publicó nada")).toBeTruthy();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("says the profile does not exist for an unknown handle", async () => {
    renderWithHub(<ProfilePage handle="nadie" />, await createSeededHub());

    expect(await screen.findByText("No existe el perfil @nadie")).toBeTruthy();
  });
});
