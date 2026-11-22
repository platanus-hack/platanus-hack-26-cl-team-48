import type { FeedMapPerson } from "@nodomics/profile";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeopleMap } from "./PeopleMap.tsx";

function person(
  fields: Pick<FeedMapPerson, "handle" | "title" | "offers" | "vector">,
): FeedMapPerson {
  return { ...fields, technical: "codes", match: false };
}

const DATA_PEOPLE = [
  person({ handle: "ana", title: "Ana Torres", offers: ["pipelines de datos"], vector: [1, 0.02] }),
  person({
    handle: "beto",
    title: "Beto Ruiz",
    offers: ["pipelines de datos abiertos"],
    vector: [0.98, 0.03],
  }),
  person({
    handle: "carla",
    title: "Carla Gómez",
    offers: ["datos limpios"],
    vector: [0.99, 0.01],
  }),
];
const PHOTO_PERSON = person({
  handle: "luis",
  title: "Luis Rojas",
  offers: ["fotografía de producto"],
  vector: [0.01, 1],
});
const PEOPLE = [...DATA_PEOPLE, PHOTO_PERSON];

const dataNiche = () => screen.getByRole("button", { name: /Datos.*3 personas|3 personas.*Datos/ });
const countOf = (text: RegExp) => screen.queryAllByText(text).length;

describe("PeopleMap niches", () => {
  it("shows a button for each niche named by its label and member count", () => {
    render(<PeopleMap people={PEOPLE} />);

    expect(dataNiche()).toBeDefined();
  });

  it("names a one-member niche with the singular count", () => {
    render(<PeopleMap people={PEOPLE} />);

    expect(screen.getByRole("button", { name: /\b1 persona(?!s)/ })).toBeDefined();
  });

  it("shows the niche label as a heading once the niche is selected", () => {
    render(<PeopleMap people={PEOPLE} />);

    fireEvent.click(dataNiche());

    expect(screen.getByRole("heading", { name: /Datos/ })).toBeDefined();
  });

  it("shows the member count of the selected niche", () => {
    render(<PeopleMap people={PEOPLE} />);
    const before = countOf(/3 personas/);

    fireEvent.click(dataNiche());

    expect(countOf(/3 personas/)).toBeGreaterThan(before);
  });

  it("shows the keywords of the selected niche", () => {
    render(<PeopleMap people={PEOPLE} />);

    fireEvent.click(dataNiche());

    expect(screen.getAllByText(/^pipelines$/i).length).toBeGreaterThan(0);
  });

  it("does not list the names of the niche members", () => {
    render(<PeopleMap people={PEOPLE} />);

    fireEvent.click(dataNiche());

    expect(DATA_PEOPLE.map((member) => screen.queryByText(member.title))).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("has no people dropdown", () => {
    render(<PeopleMap people={PEOPLE} />);

    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("explains when a search leaves the map without profiles", () => {
    render(<PeopleMap people={[]} filtered />);

    expect(screen.getByText("No hay perfiles en el mapa para esta búsqueda.")).toBeDefined();
  });
});
