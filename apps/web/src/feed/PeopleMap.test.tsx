import type { FeedMapPerson } from "@nodomics/profile";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeopleMap } from "./PeopleMap.tsx";

const ANA: FeedMapPerson = {
  handle: "ana",
  title: "Ana Torres",
  technical: "codes",
  offers: ["Visualización de datos"],
  vector: [1, 0],
  match: false,
};

const LUIS: FeedMapPerson = {
  handle: "luis",
  title: "Luis Rojas",
  technical: "uses",
  offers: ["Fotografía"],
  vector: [0, 1],
  match: true,
};

describe("PeopleMap", () => {
  it("shows a named point button for every profile", () => {
    render(<PeopleMap people={[ANA, LUIS]} />);

    expect(screen.getByRole("button", { name: ANA.title })).toBeDefined();
    expect(screen.getByRole("button", { name: LUIS.title })).toBeDefined();
  });

  it("shows what the selected profile offers", () => {
    render(<PeopleMap people={[ANA, LUIS]} />);

    fireEvent.click(screen.getByRole("button", { name: LUIS.title }));

    expect(screen.getByText("Fotografía")).toBeDefined();
  });

  it("links to the selected person's profile", () => {
    render(<PeopleMap people={[ANA, LUIS]} />);

    fireEvent.click(screen.getByRole("button", { name: LUIS.title }));

    expect(screen.getByRole("link", { name: "Abrir perfil" }).getAttribute("href")).toBe("/u/luis");
  });

  it("explains when the map has no profiles", () => {
    render(<PeopleMap people={[]} />);

    expect(screen.getByText("Todavía no hay perfiles en el mapa.")).toBeDefined();
  });
});
