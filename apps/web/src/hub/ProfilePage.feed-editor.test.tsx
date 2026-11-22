import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ANA_CARD, MINIMAL_CARD } from "../feed/feed-fixtures.ts";
import {
  clickInWizard,
  clickNext,
  editCard,
  startNewCard,
  textbox,
  wizard,
  wizardIsOpen,
} from "./profile-wizard-fixtures.tsx";

const START_HEADING = "¿Cómo quieres empezar?";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

const headingIsShown = (name: string) => within(wizard()).queryByRole("heading", { name }) !== null;

const isChecked = (group: string, name: string) =>
  within(within(wizard()).getByRole("radiogroup", { name: group })).getByRole<HTMLInputElement>(
    "radio",
    { name },
  ).checked;

async function writeItMyself() {
  const rendered = await startNewCard();
  await clickInWizard(rendered.user, "Lo escribo yo");
  return rendered;
}

describe("ProfilePage wizard start", () => {
  it("opens at step 0 with the two ways to start", async () => {
    await startNewCard();

    expect({
      heading: headingIsShown(START_HEADING),
      cv:
        within(wizard()).queryByRole("button", { name: "Sube tu CV y lo armamos por ti" }) !== null,
      manual: within(wizard()).queryByRole("button", { name: "Lo escribo yo" }) !== null,
    }).toEqual({ heading: true, cv: true, manual: true });
  });

  it("shows no step counter on step 0", async () => {
    await startNewCard();

    expect(within(wizard()).queryByText(/Paso \d de 4/)).toBeNull();
  });

  it("goes to an empty step 1 on Lo escribo yo", async () => {
    await writeItMyself();

    expect({
      heading: headingIsShown("Cuéntanos de ti"),
      step: within(wizard()).queryByText("Paso 1 de 4") !== null,
      about: textbox("Sobre ti").value,
    }).toEqual({ heading: true, step: true, about: "" });
  });

  it("selects Uso flujos que ya existen by default for a new card", async () => {
    await writeItMyself();

    expect(isChecked("¿Cómo usas Nodomics?", "Uso flujos que ya existen")).toBe(true);
  });

  it("offers the three technical choices", async () => {
    await writeItMyself();

    const group = within(wizard()).getByRole("radiogroup", { name: "¿Cómo usas Nodomics?" });

    expect(
      ["Uso flujos que ya existen", "Armo mis propios flujos", "Programo nodos nuevos"].map(
        (name) => within(group).queryByRole("radio", { name }) !== null,
      ),
    ).toEqual([true, true, true]);
  });

  it("goes back to step 0 on Atrás from step 1 of a new card", async () => {
    const { user } = await writeItMyself();

    await clickInWizard(user, "Atrás");

    expect(headingIsShown(START_HEADING)).toBe(true);
  });
});

describe("ProfilePage wizard steps", () => {
  it.each([
    [2, "¿En qué puedes ayudar?"],
    [3, "¿Qué estás buscando?"],
    [4, "Así te verán"],
  ] as const)("shows step %i of 4 with its heading", async (step, heading) => {
    const { user } = await writeItMyself();

    await clickNext(user, step - 1);

    expect({
      heading: headingIsShown(heading),
      step: within(wizard()).queryByText(`Paso ${String(step)} de 4`) !== null,
    }).toEqual({ heading: true, step: true });
  });

  it("keeps the draft when moving between steps", async () => {
    const { user } = await writeItMyself();
    await user.type(textbox("Sobre ti"), "Hola mundo");
    await clickNext(user);
    await user.type(textbox("Puedo ayudar con"), "modelos{Enter}");

    await clickNext(user);
    await clickInWizard(user, "Atrás");
    await clickInWizard(user, "Atrás");

    expect(textbox("Sobre ti").value).toBe("Hola mundo");
  });

  it("keeps the chips of step 2 after visiting step 3", async () => {
    const { user } = await writeItMyself();
    await clickNext(user);
    await user.type(textbox("Puedo ayudar con"), "modelos{Enter}");

    await clickNext(user);
    await clickInWizard(user, "Atrás");

    expect(within(wizard()).queryByRole("button", { name: "Quitar modelos" })).not.toBeNull();
  });

  it("adds a topic row with Me interesa selected by default", async () => {
    const { user } = await writeItMyself();
    await clickNext(user);

    await user.type(textbox("Temas que conoces"), "estadística{Enter}");

    expect(isChecked("Nivel en estadística", "Me interesa")).toBe(true);
  });

  it("offers the three levels for each topic", async () => {
    const { user } = await writeItMyself();
    await clickNext(user);

    await user.type(textbox("Temas que conoces"), "estadística{Enter}");

    const group = within(wizard()).getByRole("radiogroup", { name: "Nivel en estadística" });

    expect(
      ["Me interesa", "Lo practico", "Soy experto/a"].map(
        (name) => within(group).queryByRole("radio", { name }) !== null,
      ),
    ).toEqual([true, true, true]);
  });

  it("removes a topic row on Quitar", async () => {
    const { user } = await writeItMyself();
    await clickNext(user);
    await user.type(textbox("Temas que conoces"), "estadística{Enter}");

    await clickInWizard(user, "Quitar estadística");

    expect(within(wizard()).queryByRole("radiogroup", { name: "Nivel en estadística" })).toBeNull();
  });

  it("asks for the links on step 3", async () => {
    const { user } = await writeItMyself();

    await clickNext(user, 2);

    expect(
      ["Busco", "LinkedIn", "GitHub", "Sitio web"].map(
        (name) => within(wizard()).queryByRole("textbox", { name }) !== null,
      ),
    ).toEqual([true, true, true, true]);
  });

  it("goes back to step 3 on Volver a editar", async () => {
    const { user } = await writeItMyself();
    await clickNext(user, 3);

    await clickInWizard(user, "Volver a editar");

    expect(headingIsShown("¿Qué estás buscando?")).toBe(true);
  });

  it("previews the card on step 4 as others will see it", async () => {
    const { user } = await editCard(ANA_CARD);

    await clickNext(user, 3);

    expect(
      within(within(wizard()).getByRole("list", { name: "Puede ayudarte con" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(ANA_CARD.offers);
    expect(within(wizard()).queryByRole("list", { name: "Sabe de" })).not.toBeNull();
  });
});

describe("ProfilePage wizard on an existing card", () => {
  it("opens at step 1 prefilled, without step 0", async () => {
    await editCard(ANA_CARD);

    expect({
      start: headingIsShown(START_HEADING),
      step: within(wizard()).queryByText("Paso 1 de 4") !== null,
      about: textbox("Sobre ti").value,
      technical: isChecked("¿Cómo usas Nodomics?", "Armo mis propios flujos"),
    }).toEqual({
      start: false,
      step: true,
      about: ANA_CARD.about,
      technical: true,
    });
  });

  it("prefills the topics with their levels", async () => {
    const { user } = await editCard(ANA_CARD);

    await clickNext(user);

    expect([
      isChecked("Nivel en epidemiología veterinaria", "Soy experto/a"),
      isChecked("Nivel en estadística", "Lo practico"),
      isChecked("Nivel en teoría de grafos", "Me interesa"),
    ]).toEqual([true, true, true]);
  });
});

describe("ProfilePage wizard cancel", () => {
  it("closes from step 0 without saving", async () => {
    const { user, saveProfile } = await startNewCard();

    await clickInWizard(user, "Cancelar");

    expect({ open: wizardIsOpen(), saved: saveProfile.mock.calls.length }).toEqual({
      open: false,
      saved: 0,
    });
  });

  it("closes from a middle step without saving and shows the card again", async () => {
    const { user, saveProfile } = await editCard(MINIMAL_CARD);
    await clickNext(user);

    await clickInWizard(user, "Cancelar");

    expect(await screen.findByText(MINIMAL_CARD.about)).toBeTruthy();
    expect({ open: wizardIsOpen(), saved: saveProfile.mock.calls.length }).toEqual({
      open: false,
      saved: 0,
    });
  });
});
